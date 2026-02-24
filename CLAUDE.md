# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RelayID Mobile is an Expo-based React Native application that runs on iOS, Android, and Web. It integrates with blockchain technology (Ethereum/Sepolia testnet) using Wagmi and Reown AppKit (formerly WalletConnect) for wallet connectivity and authentication.

## Development Commands

### Basic Commands
- `npm start` - Start Expo development server
- `npm run android` - Run on Android emulator/device
- `npm run ios` - Run on iOS simulator/device  
- `npm run web` - Run web version
- `npm run lint` - Run ESLint

### Environment Setup
- Copy `.env.template` to `.env` and configure required variables:
  - `EXPO_PUBLIC_WC_PROJECT_ID` - Get from ReOwn (WalletConnect)
  - `EXPO_PUBLIC_ALCHEMY_API_KEY` - Get from Alchemy
  - `RELAYID_APP_API_TOKEN` - Internal API token
  - Other chain-specific configuration (Hats Protocol addresses, chain IDs, etc.)

## Architecture

### Project Structure
- **`app/`** - File-based routing using Expo Router
  - `_layout.tsx` - Root layout with providers (Wagmi, React Query, GluestackUI)
  - `(tabs)/` - Tab-based navigation screens
    - `(home)/` - Home tab screens
    - `feedback.tsx` - Feedback screen
    - `invite.tsx` - Invite screen
- **`config/`** - Configuration files
  - `wagmi.ts` - Wagmi configuration with conditional auth connector (native vs web)
  - `chains.ts` - Supported blockchain chains (currently Sepolia)
  - `metadata.ts` - App metadata for WalletConnect
- **`lib/`** - Core utilities and business logic
  - `relayId/` - RelayID API client and endpoints
  - `utils/` - Utility functions (API auth, date handling, device info, serialization, webhook security)
  - `eip712/` - EIP-712 typed data structures
  - `database/` - Type definitions for database models
  - `constants.ts` - App-wide constants
  - `device-info.ts` - Device information collection
  - `hatsAbi.ts` - Hats Protocol smart contract ABI
- **`components/`** - Reusable React components
  - `ui/` - UI component library (GluestackUI-based)
  - `AppHeader.tsx` - Application header component
  - `StatusSection.tsx` - Status display component

### Key Technologies
- **Expo 54** with new architecture enabled and React Compiler
- **React 19** with React Native 0.81
- **Expo Router** for file-based navigation with typed routes
- **Wagmi v2** for Ethereum interactions
- **Viem** for Ethereum utilities
- **Reown AppKit** (formerly WalletConnect v2) for wallet connectivity
- **TanStack Query** for async state management
- **NativeWind v4** for styling (Tailwind CSS)
- **GluestackUI** for UI components
- **Zod** for runtime validation

### Platform-Specific Behavior
- Web builds use static output (`app.json`: `"web": { "output": "static" }`)
- Auth connector is only initialized on native platforms (see `config/wagmi.ts`) to avoid SSR issues
- Android has edge-to-edge enabled with predictive back gesture disabled
- Path aliases use `@/*` prefix (mapped to root directory in `tsconfig.json`)

### Important Notes
- The app targets Sepolia testnet currently (see `.env.template`)
- Integrates with Hats Protocol for on-chain roles/permissions
- Uses custom RelayID API endpoints for backend operations
- Android modal workaround implemented in `app/_layout.tsx` for Expo issue #32991
- React is made globally available on web platform for compatibility with libraries using `React.createElement` without importing
