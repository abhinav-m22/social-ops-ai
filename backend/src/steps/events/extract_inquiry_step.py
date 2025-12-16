import os
import json
import datetime
from groq import Groq

config = {
    "type": "event",
    "name": "ExtractInquiry",
    "subscribes": ["inquiry.received"],
    "input": {
        "type": "object",
        "properties": {
            "inquiryId": {"type": "string"},
            "source": {"type": "string"},
            "body": {"type": "string"},
            "senderId": {"type": "string"},
            "threadKey": {"type": "string"},
            "sender": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "platform": {"type": "string"},
                    "id": {"type": "string"}
                }
            }
        },
        "required": ["inquiryId", "source", "body"]
    },
    "emits": ["inquiry.extracted"],
    "description": "Extracts structured brand deal data using Groq AI (Llama 4 Scout)",
    "flows": ["inquiry-processing", "dealflow"]
}

async def handler(input_data, context):
    """
    Extracts brand collaboration details from raw inquiry text using Groq's Llama 4 Scout.
    
    Input: { inquiryId, source, body, senderId?, sender? }
    Output: Emits inquiry.extracted with structured data
    """
    inquiry_id = input_data.get("inquiryId")
    body = input_data.get("body")
    source = input_data.get("source")
    thread_key = input_data.get("threadKey")
    # Capture sender from input to pass it forward
    sender = input_data.get("sender")
    
    context.logger.info(f"Starting extraction for {inquiry_id}")
    if sender:
        context.logger.info(f"Sender in input: {sender.get('name')}")
    
    context.logger.info(f"AI Extraction Input: {body}")

    if not body:
        context.logger.warn(f"No message body for inquiry {inquiry_id}")
        return
    
    try:
        # Initialize Groq client
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
        # System prompt for extraction
        system_prompt = """You are a data extraction AI for a Creator Operating System in India.

Extract brand collaboration details from the message and return ONLY valid JSON.

Required JSON structure:
{
  "brand": {
    "contactPerson": "Person's name or null",
    "email": "Email address or null"
  },
  "campaign": {
    "deliverables": [
      {
        "type": "instagram_reel|instagram_post|youtube_video|youtube_short|other",
        "count": 1,
        "description": "What they want"
      }
    ],
    "timeline": "Timeline string like '2 weeks' or null",
    "budget": {
      "mentioned": true or false,
      "amount": number or null,
      "currency": "INR"
    }
  },
  "urgency": "high|medium|low",
  "additionalNotes": "Other relevant info or empty string"
}

CRITICAL: Return ONLY the JSON object. No markdown code blocks, no explanations."""
        
        # Call Groq API
        # Using meta-llama/llama-4-scout-17b-16e-instruct as primary model
        completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": body}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        
        # Parse JSON response
        extracted_json = completion.choices[0].message.content
        
        # Enhanced logging for AI response
        context.logger.info("=" * 80)
        context.logger.info(f"AI EXTRACTION RESPONSE for Inquiry: {inquiry_id}")
        context.logger.info("=" * 80)
        context.logger.info(f"Raw AI Response: {extracted_json}")
        context.logger.info("-" * 80)
        
        try:
            extracted = json.loads(extracted_json)
            
            # Log structured data
            context.logger.info(f"Parsed Contact Person: {extracted.get('brand', {}).get('contactPerson', 'N/A')}")
            context.logger.info(f"Parsed Email: {extracted.get('brand', {}).get('email', 'N/A')}")
            context.logger.info(f"Deliverables Count: {len(extracted.get('campaign', {}).get('deliverables', []))}")
            context.logger.info(f"Timeline: {extracted.get('campaign', {}).get('timeline', 'N/A')}")
            context.logger.info(f"Budget Mentioned: {extracted.get('campaign', {}).get('budget', {}).get('mentioned', False)}")
            if extracted.get('campaign', {}).get('budget', {}).get('mentioned'):
                context.logger.info(f"Budget Amount: ₹{extracted.get('campaign', {}).get('budget', {}).get('amount', 'N/A')}")
            context.logger.info(f"Urgency: {extracted.get('urgency', 'N/A')}")
            context.logger.info("=" * 80)
            context.logger.info(f"✅ Successfully extracted and parsed data for {inquiry_id}")
            
        except json.JSONDecodeError as json_err:
            context.logger.error("=" * 80)
            context.logger.error(f"❌ JSON PARSE ERROR for Inquiry: {inquiry_id}")
            context.logger.error(f"Raw Response: {extracted_json}")
            context.logger.error(f"Error: {str(json_err)}")
            context.logger.error("=" * 80)
            await mark_as_failed(context, inquiry_id, f"JSON parse error: {str(json_err)}")
            return
        
        # Update inquiry in state
        inquiry = await context.state.get("inquiries", inquiry_id)
        if not inquiry:
            context.logger.error(f"Inquiry {inquiry_id} not found in state")
            inquiry = {"id": inquiry_id}
        
        inquiry["status"] = "extracted"
        inquiry["extractedData"] = extracted
        inquiry["extractedAt"] = datetime.datetime.now().isoformat()
        
        # Ensure sender is preserved or added if missing in state
        if sender and not inquiry.get("sender"):
             inquiry["sender"] = sender

        await context.state.set("inquiries", inquiry_id, inquiry)
        
        context.logger.info(f"✅ Inquiry updated in state: {inquiry_id}")
        
        # Emit extracted event for next step (deal creation)
        await context.emit({
            "topic": "inquiry.extracted",
            "data": {
                "inquiryId": inquiry_id,
                "source": source,
                "threadKey": thread_key or inquiry.get("threadKey"),
                "extracted": extracted,
                "sender": sender or inquiry.get("sender") # Pass sender ensuring it exists
            }
        })
        
        context.logger.info(f"✅ Emitted inquiry.extracted event for {inquiry_id}")
        
    except Exception as e:
        context.logger.error("=" * 80)
        context.logger.error(f"❌ EXTRACTION FAILED for Inquiry: {inquiry_id}")
        context.logger.error(f"Error Type: {type(e).__name__}")
        context.logger.error(f"Error Message: {str(e)}")
        context.logger.error(f"Stack Trace: {str(e.__traceback__) if hasattr(e, '__traceback__') else 'N/A'}")
        context.logger.error("=" * 80)
        await mark_as_failed(context, inquiry_id, str(e))


async def mark_as_failed(context, inquiry_id, error_msg):
    """Helper to mark inquiry as extraction_failed"""
    inquiry = await context.state.get("inquiries", inquiry_id) or {"id": inquiry_id}
    inquiry["status"] = "extraction_failed"
    inquiry["error"] = error_msg
    await context.state.set("inquiries", inquiry_id, inquiry)
