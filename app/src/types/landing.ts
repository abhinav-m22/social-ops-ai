export interface ProblemCard {
    icon: string;
    title: string;
    description: string;
    stat?: string;
}

export interface SolutionFeature {
    icon: string;
    title: string;
    description: string;
    link?: string;
}

export interface Testimonial {
    name: string;
    role: string;
    niche: string;
    followers: string;
    quote: string;
    avatar?: string;
}

export interface Stat {
    value: string;
    label: string;
    description: string;
}

export interface FlowStep {
    step: number;
    title: string;
    description: string;
    icon: string;
}
