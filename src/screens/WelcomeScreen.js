import React, { useState } from "react";
import {
  FlatList,
  Image,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { styles } from "../styles/landingStyle";

const logoImage = require("../../assets/logo.png");

const slides = [
  {
    id: "slide-1",
    image: require("../../assets/Background1.jpg"),
  },
  {
    id: "slide-2",
    image: require("../../assets/Background2.jpg"),
  },
  {
    id: "slide-3",
    image: require("../../assets/Background3.jpg"),
  },
];

export default function WelcomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

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
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />

      <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
        <View style={styles.contentShell} pointerEvents="box-none">
          <View style={styles.brandBlock}>
            <View style={styles.logoRow}>
              <Image source={logoImage} style={styles.brandLogo} resizeMode="contain" />
              <Text style={styles.brandInlineText}>CAPT FleetX</Text>
            </View>
          </View>

          <View style={styles.heroSection} pointerEvents="box-none">
            <View style={styles.textBlock}>
              <Text style={styles.headline}>Need a Ride? We've Got You Covered!</Text>
              <Text style={styles.subtitle}>
                Whether it's a quick drive around the city or a weekend getaway,
                we've got the perfect ride for you.
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
                onPress={() => navigation.navigate("RegisterClient")}
              >
                <Text style={styles.ctaText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footerBlock}>
            <View style={styles.loginRow}>
              <Text style={styles.loginLabel}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("ClientLogin")}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
