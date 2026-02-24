import Toast from "react-native-toast-message";

export function useToast() {
  return {
    show: ({
      title,
      description,
      action = "info",
      duration = 3000,
    }: {
      title?: string;
      description?: string;
      action?: "success" | "error" | "info" | "warning";
      duration?: number;
    }) => {
      Toast.show({
        type: action,
        text1: title,
        text2: description,
        visibilityTime: duration,
        position: "top",
        topOffset: 60,
      });
    },
  };
}
