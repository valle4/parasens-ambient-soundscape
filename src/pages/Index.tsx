import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import MusicPlayer from "@/components/MusicPlayer";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import AnalyticsConsent from "@/components/AnalyticsConsent";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <StatsSection />
      <MusicPlayer />
      <AboutSection />
      <ContactSection />
      <Footer />
      <AnalyticsConsent />
    </div>
  );
};

export default Index;
