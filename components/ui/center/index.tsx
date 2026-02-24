import React from "react";
import { View } from "react-native";
import { centerStyle } from "./styles";

import type { VariantProps } from "@gluestack-ui/utils/nativewind-utils";

type ICenterProps = React.ComponentPropsWithoutRef<typeof View> &
  VariantProps<typeof centerStyle> & { className?: string };

const Center = React.forwardRef<React.ElementRef<typeof View>, ICenterProps>(
  function Center({ className, ...props }, ref) {
    return (
      <View
        ref={ref}
        className={centerStyle({ class: className })}
        {...props}
      />
    );
  }
);

Center.displayName = "Center";

export { Center };
