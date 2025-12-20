import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "SocialOps AI - AI-Powered Brand Collaboration Platform for Indian Creators",
    description: "Manage brand collaborations, negotiate rates, track payments, and automate invoicing - all in one place. Built for Indian creators with AI intelligence.",
    keywords: "creator economy, brand collaboration, influencer management, AI automation, GST invoicing, India",
    openGraph: {
        title: "SocialOps AI - Stop Juggling DMs. Start Closing Deals.",
        description: "AI-powered brand collaboration platform for Indian creators. Manage inquiries, negotiate rates, track payments. All in one place!",
        type: "website",
        locale: "en_IN",
    },
    twitter: {
        card: "summary_large_image",
        title: "SocialOps AI - AI-Powered Brand Collaboration Platform",
        description: "Manage brand collaborations effortlessly with AI intelligence. Built for Indian creators.",
    }
};

export default function LandingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-white">
            {children}
        </div>
    );
}
