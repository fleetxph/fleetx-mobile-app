import React, { useState } from "react";
import {
  FlatList,
  Image,
  ImageBackground,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "../styles/landingStyle";

const logoImage = require("../../assets/logo.png");

const slides = [
  {
    id: "slide-1",
    image: require("../../assets/Ativ.png"),
  },
  {
    id: "slide-2",
    image: require("../../assets/Fortuner.png"),
  },
  {
    id: "slide-3",
    image: require("../../assets/Hiace.png"),
  },
];

export default function WelcomeScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const isCompactHeight = height < 720;

  const handleMomentumEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / width);
    setActiveIndex(nextIndex);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <FlatList
        style={styles.slider}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item }) => (
          <ImageBackground
            source={item.image}
            resizeMode="cover"
            style={[styles.background, { width }]}
            imageStyle={styles.backgroundImage}
          />
        )}
      />

      <View pointerEvents="none" style={styles.overlay} />
      <View pointerEvents="none" style={styles.bottomShade} />

      <View
        style={[
          styles.safeArea,
          {
            paddingTop: insets.top + (isCompactHeight ? 8 : 12),
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.contentShell} pointerEvents="box-none">
          <View style={styles.brandBlock}>
            <View style={styles.logoRow}>
              <View style={styles.logoChip}>
                <Image source={logoImage} style={styles.brandLogo} resizeMode="contain" />
              </View>
              <Text style={styles.brandInlineText}>CAPT FleetX</Text>
            </View>
          </View>

          <View style={styles.heroSection} pointerEvents="box-none">
            <View style={styles.textBlock}>
              <Text style={styles.headline}>Your next ride, ready when you are.</Text>
              <Text style={styles.subtitle}>
                From city errands to weekend getaways, find a practical ride for every trip.
              </Text>
            </View>

            <View style={styles.paginationRow}>
              {slides.map((slide, index) => (
                <View
                  key={slide.id}
                  style={[
                    styles.paginationDot,
                    index === activeIndex
                      ? styles.paginationDotActive
                      : styles.paginationDotInactive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.actionBlock}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.ctaButton}
                onPress={() => navigation.replace("MainApp")}
                accessibilityRole="button"
              >
                <Text style={styles.ctaText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footerBlock}>
            <View style={styles.loginRow}>
              <Text style={styles.loginLabel}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("ClientLogin")}
                accessibilityRole="button"
              >
                <Text style={styles.loginLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
