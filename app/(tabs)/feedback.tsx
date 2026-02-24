import React, { useState } from "react";
import { Modal, Pressable, ScrollView, TextInput } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { AppHeader } from "@/components/AppHeader";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useDemoMode } from "@/contexts/DemoContext";
import { useToast } from "@/hooks/useToast";
import { getDeviceInfo } from "@/lib/device-info";
import { submitFeedback } from "@/lib/relayId/api";

export default function HelpAndFeedbackPage() {
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = insets.bottom + 64;
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentiment, setSentiment] = useState<"up" | "down" | null>(null);

  const handleCloseModal = () => {
    setFeedbackText("");
    setSentiment(null);
    setShowFeedbackModal(false);
  };

  const handleSendFeedback = async () => {
    if (!sentiment) {
      toast.show({
        title: "Error",
        description:
          "Please select how your experience was (👍 or 👎) before sending.",
        action: "error",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitFeedback({
        sentiment: sentiment!,
        feedback: feedbackText,
        user: "anonymous",
        page: "feedback",
        deviceInfo: getDeviceInfo(),
      });

      if ("error" in result) {
        toast.show({
          title: "Error",
          description: result.error,
          action: "error",
        });
        setIsSubmitting(false);
        return;
      }

      toast.show({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
        action: "success",
      });
      handleCloseModal();
    } catch {
      toast.show({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        action: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWordCount = (text: string) => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  };

  const wordCount = getWordCount(feedbackText);
  const isOverLimit = wordCount > 500;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <AppHeader />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: scrollPaddingBottom,
          flexGrow: 1,
        }}
      >
        <Box className="px-6 py-6 flex-1">
          <VStack className="gap-10 flex-1">
            {/* Help Section */}
            <VStack className="gap-4">
              <Heading className="text-xl font-bold text-gray-900">
                Need Help?
              </Heading>

              <Text className="text-base text-gray-600">
                If you&apos;re having trouble with RelayID, here are some common
                solutions:
              </Text>

              <VStack className="gap-3">
                <HStack className="items-start gap-3">
                  <Text className="text-base text-gray-900">•</Text>
                  <Text className="text-base text-gray-900 flex-1">
                    Make sure your phone is connected to the internet
                  </Text>
                </HStack>
                <HStack className="items-start gap-3">
                  <Text className="text-base text-gray-900">•</Text>
                  <Text className="text-base text-gray-900 flex-1">
                    Try signing out and signing back in
                  </Text>
                </HStack>
                <HStack className="items-start gap-3">
                  <Text className="text-base text-gray-900">•</Text>
                  <Text className="text-base text-gray-900 flex-1">
                    Contact another community leader for help
                  </Text>
                </HStack>
              </VStack>
            </VStack>

            {/* Demo Mode Section */}
            <VStack className="gap-4 pt-4 border-t border-gray-200">
              <Heading className="text-xl font-bold text-gray-900">
                Demo Mode
              </Heading>

              <Text className="text-base text-gray-600">
                Try out RelayID features with simulated data - perfect for
                reviewers and testing.
              </Text>

              <Button
                size="xl"
                className={`w-full ${
                  isDemoMode ? "bg-orange-600" : "bg-purple-600"
                }`}
                onPress={toggleDemoMode}
              >
                <HStack className="items-center justify-center gap-4">
                  <MaterialIcons
                    name={isDemoMode ? "stop-circle" : "play-circle-outline"}
                    size={24}
                    color="#ffffff"
                  />
                  <Text className="text-white font-bold text-lg">
                    {isDemoMode ? "End Demo" : "Start Demo"}
                  </Text>
                </HStack>
              </Button>

              {isDemoMode && (
                <Box className="bg-orange-50 px-4 py-3 rounded-lg border border-orange-200">
                  <HStack className="items-center gap-2">
                    <MaterialIcons
                      name="info-outline"
                      size={20}
                      color="#ea580c"
                    />
                    <Text className="text-sm text-orange-800">
                      Demo mode is active. All data is simulated.
                    </Text>
                  </HStack>
                </Box>
              )}
            </VStack>

            {/* Feedback Section */}
            <VStack className="gap-4 pt-4 border-t border-gray-200">
              <Heading className="text-xl font-bold text-gray-900">
                Share Feedback
              </Heading>

              <Text className="text-base text-gray-600">
                Help us improve RelayID by sharing your thoughts and
                suggestions.
              </Text>

              <Button
                size="xl"
                className="w-full bg-blue-600"
                onPress={() => setShowFeedbackModal(true)}
              >
                <HStack className="items-center justify-center gap-4">
                  <MaterialIcons name="feedback" size={24} color="#ffffff" />
                  <Text className="text-white font-bold text-lg">
                    Send Feedback
                  </Text>
                </HStack>
              </Button>
            </VStack>
          </VStack>
        </Box>
      </ScrollView>

      {/* Feedback Modal */}
      <Modal
        visible={showFeedbackModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-white">
          <VStack className="flex-1">
            {/* Modal Header */}
            <HStack className="items-center justify-between px-6 py-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-900">
                Send Feedback
              </Text>
              <Pressable onPress={handleCloseModal}>
                <MaterialIcons name="close" size={24} color="#374151" />
              </Pressable>
            </HStack>

            {/* Modal Content */}
            <ScrollView className="flex-1 px-6 py-6">
              <VStack className="gap-6">
                <VStack className="gap-4">
                  <Text className="text-base text-gray-600">
                    Help us improve RelayID by sharing your thoughts,
                    suggestions, or reporting any issues you&apos;ve
                    encountered.
                  </Text>
                  <VStack className="gap-2">
                    <HStack className="items-center gap-2">
                      <Box className="w-2 h-2 bg-red-500 rounded-full"></Box>
                      <Text className="text-sm text-gray-600">
                        Rate your experience with thumbs up or down
                      </Text>
                    </HStack>
                    <HStack className="items-center gap-2">
                      <Box className="w-2 h-2 bg-gray-300 rounded-full"></Box>
                      <Text className="text-sm text-gray-500">
                        Share additional details (optional)
                      </Text>
                    </HStack>
                  </VStack>
                </VStack>

                {/* Sentiment Selection */}
                <VStack className="gap-3">
                  <HStack className="items-center gap-2">
                    <Text className="text-base font-medium text-gray-700">
                      How was your experience?
                    </Text>
                    <Text className="text-sm text-red-600 font-medium">*</Text>
                  </HStack>
                  <HStack className="gap-4 justify-center">
                    <Pressable
                      onPress={() => setSentiment("up")}
                      className={`px-6 py-4 rounded-xl border-2 ${
                        sentiment === "up"
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <VStack className="items-center gap-2">
                        <Text className="text-4xl">👍</Text>
                        <Text
                          className={`text-sm font-medium ${
                            sentiment === "up"
                              ? "text-green-700"
                              : "text-gray-600"
                          }`}
                        >
                          Good
                        </Text>
                      </VStack>
                    </Pressable>

                    <Pressable
                      onPress={() => setSentiment("down")}
                      className={`px-6 py-4 rounded-xl border-2 ${
                        sentiment === "down"
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <VStack className="items-center gap-2">
                        <Text className="text-4xl">👎</Text>
                        <Text
                          className={`text-sm font-medium ${
                            sentiment === "down"
                              ? "text-red-700"
                              : "text-gray-600"
                          }`}
                        >
                          Bad
                        </Text>
                      </VStack>
                    </Pressable>
                  </HStack>
                </VStack>

                {/* Feedback Input */}
                <VStack className="gap-3">
                  <HStack className="items-center gap-2">
                    <Text className="text-base font-medium text-gray-700">
                      Your Feedback
                    </Text>
                    <Text className="text-sm text-gray-500 font-normal">
                      (optional)
                    </Text>
                  </HStack>
                  <Box className="bg-gray-50 px-4 py-4 rounded-lg border border-gray-200">
                    <TextInput
                      value={feedbackText}
                      onChangeText={setFeedbackText}
                      placeholder="Share additional details about your experience... (optional, max 500 words)"
                      className="text-base text-gray-800 min-h-[200px]"
                      multiline={true}
                      textAlignVertical="top"
                      maxLength={3000} // Rough estimate for 500 words
                    />
                  </Box>

                  {/* Word Count */}
                  <HStack className="items-center justify-between">
                    <Text
                      className={`text-sm ${
                        isOverLimit ? "text-red-600" : "text-gray-500"
                      }`}
                    >
                      {wordCount} / 500 words
                    </Text>
                    {isOverLimit && (
                      <Text className="text-sm text-red-600 font-medium">
                        Please reduce your feedback to 500 words or less
                      </Text>
                    )}
                  </HStack>
                </VStack>
              </VStack>
            </ScrollView>

            {/* Modal Footer */}
            <Box className="px-6 py-4 border-t border-gray-200">
              <VStack className="gap-3">
                <Button
                  className="w-full bg-blue-600"
                  onPress={handleSendFeedback}
                  disabled={isSubmitting || isOverLimit || !sentiment}
                >
                  <HStack className="items-center justify-center gap-3">
                    {isSubmitting ? (
                      <>
                        <MaterialIcons
                          name="hourglass-empty"
                          size={20}
                          color="#ffffff"
                        />
                        <Text className="text-white font-semibold text-base">
                          Sending...
                        </Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcons name="send" size={20} color="#ffffff" />
                        <Text className="text-white font-semibold text-base">
                          Submit Rating
                        </Text>
                      </>
                    )}
                  </HStack>
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-gray-300"
                  onPress={handleCloseModal}
                  disabled={isSubmitting}
                >
                  <Text className="text-gray-700 font-medium">Cancel</Text>
                </Button>
              </VStack>
            </Box>
          </VStack>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
