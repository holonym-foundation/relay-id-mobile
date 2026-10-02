import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
    Icon,
    Label,
    NativeTabs,
    VectorIcon,
} from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Label>My RelayID</Label>
        {Platform.select({
          ios: <Icon sf={{ default: "house", selected: "house.fill" }} />,
          android: (
            <Icon
              src={<VectorIcon family={MaterialIcons} name="person-outline" />}
              selectedColor="blue"
            />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(invite)">
        <Label>Invite</Label>
        {Platform.select({
          ios: <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />,
          android: (
            <Icon
              src={<VectorIcon family={MaterialIcons} name="group-add" />}
              selectedColor="blue"
            />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="feedback">
        <Label>Help</Label>
        {Platform.select({
          ios: (
            <Icon
              sf={{
                default: "questionmark.circle",
                selected: "questionmark.circle.fill",
              }}
            />
          ),
          android: (
            <Icon
              src={<VectorIcon family={MaterialIcons} name="help-outline" />}
              selectedColor="blue"
            />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(stellar)" hidden />
      <NativeTabs.Trigger name="(stellar-native)">
        <Label>Stellar Native</Label>
        {Platform.select({
          ios: <Icon sf={{ default: "sparkles", selected: "sparkles" }} />,
          android: (
            <Icon
              src={<VectorIcon family={MaterialIcons} name="auto-awesome" />}
              selectedColor="blue"
            />
          ),
        })}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
