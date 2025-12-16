export const HIGH_CONFIDENCE_TEMPLATE =
    'Hi [Brand Contact], thank you for reaching out! This sounds like an interesting opportunity. Could you please share more details about the specific deliverables, timeline, and budget range you have in mind? This will help me evaluate if we are a good fit. Looking forward to hearing from you!'

export const DECLINE_TEMPLATE =
    'Hi [Brand Contact], thank you so much for considering me for this collaboration! I really appreciate you reaching out. Unfortunately, I\'m unable to take on this project at the moment due to my current commitments. I wish you all the best with your campaign, and I hope we can work together in the future!'


// Template structure for AI-generated proposals (used as guidance)
export const PROPOSAL_TEMPLATE_STRUCTURE = `
Hello [Contact/Brand],

Thank you for reaching out! I'm excited about the opportunity to collaborate with [Brand Name].

Based on your requirements for [deliverables], I'd love to discuss this further. My standard rate for [deliverable type] is ₹[rate], which includes [what's included].

To provide you with the best proposal, could you please share:
- Your preferred timeline
- Any specific messaging or requirements
- Your budget range

I'm looking forward to creating something amazing together!

Best regards,
[Creator Name]
`

export const personalizeMessage = (template, brandContact, brandName) => {
    const contact = brandContact || brandName || 'there'
    return template.replace(/\[Brand Contact\]/g, contact)
}


