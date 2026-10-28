import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import "react-native-reanimated";

import { defaultTextStyle, globalFontStyle } from "@/constants/typography";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { Platform, StatusBar as RNStatusBar, Text, TextInput, View } from "react-native";

export const unstable_settings = {
  anchor: "(tabs)",
};

SplashScreen.preventAutoHideAsync().catch(() => {});

const baseInputStyle = {
  fontFamily: defaultTextStyle.fontFamily,
  fontSize: defaultTextStyle.fontSize,
  includeFontPadding: false,
};

function applyGlobalTypography() {
  const textComponent = Text as any;
  const inputComponent = TextInput as any;

  textComponent.defaultProps = textComponent.defaultProps || {};
  textComponent.defaultProps.style = [defaultTextStyle, textComponent.defaultProps.style];
  textComponent.defaultProps.maxFontSizeMultiplier = 1;

  inputComponent.defaultProps = inputComponent.defaultProps || {};
  inputComponent.defaultProps.style = [baseInputStyle, inputComponent.defaultProps.style];
  inputComponent.defaultProps.maxFontSizeMultiplier = 1;
  inputComponent.defaultProps.placeholderTextColor =
    inputComponent.defaultProps.placeholderTextColor || "#8A7CA8";

  if (typeof textComponent.render === "function" && !textComponent.__iieTypographyPatched) {
    const originalTextRender = textComponent.render;
    textComponent.render = function renderWithTypography(...args: unknown[]) {
      const element = originalTextRender.apply(this, args);
      return React.cloneElement(element, {
        style: [defaultTextStyle, element.props.style, globalFontStyle],
      });
    };
    textComponent.__iieTypographyPatched = true;
  }

  if (typeof inputComponent.render === "function" && !inputComponent.__iieTypographyPatched) {
    const originalInputRender = inputComponent.render;
    inputComponent.render = function renderInputWithTypography(...args: unknown[]) {
      const element = originalInputRender.apply(this, args);
      return React.cloneElement(element, {
        style: [baseInputStyle, element.props.style, globalFontStyle],
      });
    };
    inputComponent.__iieTypographyPatched = true;
  }
}

applyGlobalTypography();

export default function RootLayout() {
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingTop:
              Platform.OS === "android"
                ? (RNStatusBar.currentHeight?? 0) * 0.1
                : 0,
          }}

          
        >
          <ThemeProvider value={DefaultTheme}>
            <Stack screenOptions={{ headerShown: false, gestureEnabled: true }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal" }}
              />
            </Stack>

            <StatusBar style="dark" backgroundColor="#F6F3FF" translucent={false} />
          </ThemeProvider>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
