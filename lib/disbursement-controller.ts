import {
  actionText, DisbursementError, disbursementErrorMessage, disbursementListSchema,
  redeemResultSchema, sessionSchema, type ActionMessage, type ApiRequest,
  type Disbursement, type StoredSession,
} from './stellar-disbursements';

type Dependencies = {
  address: string; passphrase: string; api: ApiRequest;
  storage: { read(): Promise<StoredSession | null>; write(session: StoredSession): Promise<void>; clear(): Promise<void> };
  nonce(): string;
  sign(text: string, signal: AbortSignal): Promise<string>;
};
export type DisbursementState = {
  authenticated: boolean; loaded: boolean; fresh: boolean; items: Disbursement[];
  busy: 'restore' | 'signIn' | 'refresh' | 'redeem' | null;
  redeemingId: string | null; error: string | null;
};
const initialState = (): DisbursementState => ({
  authenticated: false, loaded: false, fresh: false, items: [], busy: null, redeemingId: null, error: null,
});

export class DisbursementController {
  private state = initialState();
  private listeners = new Set<() => void>();
  private active: AbortController | null = null;
  private session: StoredSession | null = null;
  private stopped = false;
  constructor(private deps: Dependencies) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private patch(patch: Partial<DisbursementState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private check(signal: AbortSignal) {
    if (signal.aborted || this.stopped) throw new Error('This wallet session has ended.');
  }
  private async run(busy: DisbursementState['busy'], work: (signal: AbortSignal) => Promise<void>) {
    if (this.active || this.stopped) return;
    const controller = new AbortController();
    this.active = controller;
    this.patch({ busy, error: null });
    try { await work(controller.signal); }
    catch (error) {
      if (!controller.signal.aborted && !this.stopped) this.patch({ error: disbursementErrorMessage(error) });
    } finally {
      if (this.active === controller) {
        this.active = null;
        this.patch({ busy: null, redeemingId: null });
      }
    }
  }
  private async clearSession(signal: AbortSignal) {
    this.check(signal);
    this.session = null;
    this.patch({ authenticated: false, items: [], loaded: false, fresh: false });
    await this.deps.storage.clear();
    this.check(signal);
  }
  private async list(signal: AbortSignal) {
    this.check(signal);
    if (!this.session || this.session.expiresAt <= Date.now() / 1000) {
      await this.clearSession(signal);
      throw new DisbursementError('no_session');
    }
    try {
      const { data } = await this.deps.api('/api/disbursements/mine', { cookie: this.session.cookie, signal });
      this.check(signal);
      const parsed = disbursementListSchema.safeParse(data);
      if (!parsed.success || parsed.data.disbursements.some((item) => item.beneficiary !== this.deps.address)) {
        throw new DisbursementError('invalid_response');
      }
      this.patch({ items: parsed.data.disbursements, loaded: true, fresh: true, authenticated: true });
    } catch (error) {
      this.check(signal);
      this.patch({ fresh: false });
      if (error instanceof DisbursementError && error.code === 'no_session') await this.clearSession(signal);
      throw error;
    }
  }
  restore = () => this.run('restore', async (signal) => {
    const saved = await this.deps.storage.read();
    this.check(signal);
    if (!saved) return;
    this.session = saved;
    if (saved.address !== this.deps.address || saved.expiresAt <= Date.now() / 1000) {
      try { await this.deps.api('/api/session/stellar', { method: 'DELETE', cookie: saved.cookie, signal }); }
      finally { await this.clearSession(signal); }
      return;
    }
    try {
      const { data } = await this.deps.api('/api/session/stellar', { cookie: saved.cookie, signal });
      this.check(signal);
      const parsed = sessionSchema.safeParse(data);
      if (!parsed.success || parsed.data.address !== this.deps.address) throw new DisbursementError('invalid_response');
      this.session = { ...saved, ...parsed.data };
      await this.list(signal);
    } catch (error) {
      this.check(signal);
      if (error instanceof DisbursementError && error.code === 'no_session') {
        await this.clearSession(signal);
        return;
      }
      throw error;
    }
  });
  private async signedBody(id: string | undefined, signal: AbortSignal) {
    this.check(signal);
    const common = { nonce: this.deps.nonce(), issuedAt: String(Math.floor(Date.now() / 1000)) };
    const message: ActionMessage = id ? { beneficiary: this.deps.address, disbursementId: id, ...common } :
      { account: this.deps.address, ...common };
    const signature = await this.deps.sign(actionText(message, this.deps.passphrase), signal);
    this.check(signal);
    return { message, signature };
  }
  signIn = () => this.run('signIn', async (signal) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const body = await this.signedBody(undefined, signal);
        const { data, cookie } = await this.deps.api('/api/session/stellar', { method: 'POST', body, signal });
        if (signal.aborted || this.stopped) {
          // A native HTTP client can finish after cancellation. Revoke any late cookie.
          if (cookie) await this.deps.api('/api/session/stellar', { method: 'DELETE', cookie }).catch(() => {});
          this.check(signal);
        }
        const parsed = sessionSchema.safeParse(data);
        if (!parsed.success || parsed.data.address !== this.deps.address || !cookie || parsed.data.expiresAt <= Date.now() / 1000) {
          throw new DisbursementError('invalid_response');
        }
        this.session = { ...parsed.data, cookie };
        await this.deps.storage.write(this.session);
        this.check(signal);
        this.patch({ authenticated: true });
        await this.list(signal);
        return;
      } catch (error) {
        this.check(signal);
        if (attempt === 0 && error instanceof DisbursementError && ['expired_signature', 'replay'].includes(error.code)) continue;
        throw error;
      }
    }
  });
  refresh = () => this.run('refresh', (signal) => this.list(signal));
  redeem = (id: string) => this.run('redeem', async (signal) => {
    if (!this.state.fresh || !this.state.authenticated || this.state.items.find((item) => item.id === id)?.status !== 'pending') return;
    if (!this.session || this.session.expiresAt <= Date.now() / 1000) {
      await this.clearSession(signal);
      throw new DisbursementError('no_session');
    }
    this.patch({ redeemingId: id });
    for (let attempt = 0; attempt < 2; attempt++) {
      const body = await this.signedBody(id, signal);
      this.patch({ fresh: false });
      let failure: unknown;
      try {
        const { data } = await this.deps.api('/api/disbursements/redeem', { method: 'POST', body, signal });
        this.check(signal);
        const result = redeemResultSchema.safeParse(data);
        if (!result.success || result.data.disbursement.id !== id || result.data.disbursement.beneficiary !== this.deps.address) {
          throw new DisbursementError('invalid_response');
        }
        this.patch({ items: this.state.items.map((item) => item.id === id ? result.data.disbursement : item) });
      } catch (error) { failure = error; }
      this.check(signal);
      // Even explicit failures must be followed by a read. No read = no further redeem.
      try { await this.list(signal); }
      catch {
        this.check(signal);
        const message = failure ? `${disbursementErrorMessage(failure)} ` : '';
        this.patch({ error: `${message}Unable to refresh the list. Refresh or sign in again before redeeming.`, fresh: false });
        return;
      }
      this.check(signal);
      if (attempt === 0 && failure instanceof DisbursementError && ['expired_signature', 'replay'].includes(failure.code) &&
        this.state.items.find((item) => item.id === id)?.status === 'pending') continue;
      if (failure) throw failure;
      return;
    }
  });
  dispose = () => {
    this.stopped = true;
    this.active?.abort();
    this.active = null;
  };
  endSession = async () => {
    this.dispose();
    const session = this.session;
    this.session = null;
    this.patch(initialState());
    // Delete locally even when the network is offline. Never resurrect a late signed request.
    const saved = session ?? await this.deps.storage.read();
    await this.deps.storage.clear();
    if (!saved) return true;
    try {
      await this.deps.api('/api/session/stellar', { method: 'DELETE', cookie: saved.cookie });
      return true;
    } catch { return false; }
  };
}
