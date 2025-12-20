import Hero from "@/components/landing/Hero";
import Problems from "@/components/landing/Problems";
import Solutions from "@/components/landing/Solutions";
import HowItWorks from "@/components/landing/HowItWorks";
import Differentiators from "@/components/landing/Differentiators";
import SocialProof from "@/components/landing/SocialProof";
import Stats from "@/components/landing/Stats";
import Pricing from "@/components/landing/Pricing";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
    return (
        <main className="w-full overflow-x-hidden">
            <Hero />
            <Problems />
            <Solutions />
            <HowItWorks />
            <Differentiators />
            <SocialProof />
            <Stats />
            {/* <Pricing /> */}
            {/* <FinalCTA /> */}
            <Footer />
        </main>
    );
}
