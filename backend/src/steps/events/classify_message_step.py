import os
import json
import datetime
from groq import Groq

config = {
    "type": "event",
    "name": "ClassifyMessage",
    "subscribes": ["message.enriched"],
    "input": {
        "type": "object",
        "properties": {
            "messageId": {"type": "string"},
            "source": {"type": "string"},
            "body": {"type": "string"},
            "senderId": {"type": "string"},
            "sender": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "platform": {"type": "string"},
                    "id": {"type": "string"}
                }
            },
            "subject": {"type": "string"},  # For emails
            "pageName": {"type": "string"}  # For facebook page attribution
        },
        "required": ["messageId", "source", "body"]
    },
    "emits": ["message.classified"],
    "description": "Classifies if a message is a brand collaboration inquiry using AI",
    "flows": ["inquiry-processing"]
}

async def handler(input_data, context):
    """
    Classifies if a message is related to brand collaboration/influencer marketing.
    
    Input: { messageId, source, body, senderId?, sender?, subject? }
    Output: Emits message.classified with { isBrandInquiry, confidence, reasoning }
    """
    message_id = input_data.get("messageId")
    body = input_data.get("html")
    source = input_data.get("source")
    subject = input_data.get("subject", "")
    
    # Use enriched sender info if available
    sender = input_data.get("sender", {})
    sender_name = sender.get("name")
    
    context.logger.info("=" * 80)
    context.logger.info(f"CLASSIFYING MESSAGE: {message_id}")
    context.logger.info("=" * 80)
    context.logger.info(f"Source: {source}")
    context.logger.info(f"Sender: {sender_name or input_data.get('senderId')}")
    context.logger.info(f"Subject: {subject}")
    context.logger.info(f"Body Preview: {body[:100]}...")
    
    if not body:
        context.logger.warn(f"No message body for {message_id}")
        return
    
    try:
        # Initialize Groq client
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
        # System prompt for classification
        system_prompt = """You are a message classifier for a Creator Operating System in India.

Your task: Determine if a message is a BRAND COLLABORATION INQUIRY.

A brand collaboration inquiry is when:
- A brand/company wants to work with a content creator/influencer
- Mentions collaboration, partnership, sponsorship, brand deal
- Asks for content creation (Instagram Reel, YouTube video, etc.)
- Mentions budget, payment, or compensation
- Product reviews, unboxing, promotional content requests

NOT a brand inquiry if:
- General greetings, casual conversation
- Fan messages, appreciation
- Personal messages
- Spam, promotional messages from individuals
- Technical support requests
- Job applications (unless for creator role)

Return ONLY valid JSON:
{
  "isBrandInquiry": true or false,
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of your decision",
  "keywords": ["list", "of", "relevant", "keywords", "found"]
}

CRITICAL: Return ONLY the JSON object. No markdown, no explanations."""
        
        # Combine subject and body for email context
        full_text = f"Subject: {subject}\n\n{body}" if subject else body
        
        # Add sender context if available
        if sender_name:
             full_text = f"Sender Name: {sender_name}\n{full_text}"

        # Call Groq API
        completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_text}
            ],
            response_format={"type": "json_object"},
            temperature=0.2  # Lower temperature for more consistent classification
        )
        
        # Parse JSON response
        classification_json = completion.choices[0].message.content
        
        context.logger.info(f"AI Classification Response: {classification_json}")
        context.logger.info("-" * 80)
        
        try:
            classification = json.loads(classification_json)
            
            is_brand_inquiry = classification.get("isBrandInquiry", False)
            confidence = classification.get("confidence", 0.0)
            reasoning = classification.get("reasoning", "No reasoning provided")
            keywords = classification.get("keywords", [])
            
            # Log classification result
            context.logger.info(f"Classification Result: {'✅ BRAND INQUIRY' if is_brand_inquiry else '❌ NOT BRAND INQUIRY'}")
            context.logger.info(f"Confidence: {confidence:.2%}")
            context.logger.info(f"Reasoning: {reasoning}")
            context.logger.info(f"Keywords Found: {', '.join(keywords) if keywords else 'None'}")
            context.logger.info("=" * 80)
            
            # Emit classification result
            emit_data = {
                "messageId": message_id,
                "source": source,
                "body": body,
                "subject": subject,
                "senderId": input_data.get("senderId"),
                "sender": sender, # Pass enriched sender info
                "pageName": input_data.get("pageName"),
                "isBrandInquiry": is_brand_inquiry,
                "confidence": confidence,
                "reasoning": reasoning,
                "keywords": keywords,
                "classifiedAt": datetime.datetime.now().isoformat()
            }
            # Pass through email threading metadata if available
            if source == "email":
                if input_data.get("inReplyTo"):
                    emit_data["inReplyTo"] = input_data.get("inReplyTo")
                if input_data.get("references"):
                    emit_data["references"] = input_data.get("references")
                if input_data.get("emailHeaders"):
                    emit_data["emailHeaders"] = input_data.get("emailHeaders")
            
            await context.emit({
                "topic": "message.classified",
                "data": emit_data
            })
            
            context.logger.info(f"✅ Classification event emitted for {message_id}")
            
        except json.JSONDecodeError as json_err:
            context.logger.error("=" * 80)
            context.logger.error(f"❌ JSON PARSE ERROR for Classification: {message_id}")
            context.logger.error(f"Raw Response: {classification_json}")
            context.logger.error(f"Error: {str(json_err)}")
            context.logger.error("=" * 80)
            # Default to NOT brand inquiry if parsing fails
            emit_data = {
                "messageId": message_id,
                "source": source,
                "body": body,
                "subject": subject,
                "senderId": input_data.get("senderId"),
                "sender": sender,
                "pageName": input_data.get("pageName"),
                "isBrandInquiry": False,
                "confidence": 0.0,
                "reasoning": f"Classification failed: {str(json_err)}",
                "keywords": [],
                "classifiedAt": datetime.datetime.now().isoformat()
            }
            # Pass through email threading metadata if available
            if source == "email":
                if input_data.get("inReplyTo"):
                    emit_data["inReplyTo"] = input_data.get("inReplyTo")
                if input_data.get("references"):
                    emit_data["references"] = input_data.get("references")
                if input_data.get("emailHeaders"):
                    emit_data["emailHeaders"] = input_data.get("emailHeaders")
            
            await context.emit({
                "topic": "message.classified",
                "data": emit_data
            })
            
    except Exception as e:
        context.logger.error("=" * 80)
        context.logger.error(f"❌ CLASSIFICATION FAILED for Message: {message_id}")
        context.logger.error(f"Error Type: {type(e).__name__}")
        context.logger.error(f"Error Message: {str(e)}")
        context.logger.error("=" * 80)
        
        # Emit with default (not brand inquiry) on error
        emit_data = {
            "messageId": message_id,
            "source": source,
            "body": body,
            "subject": subject,
            "senderId": input_data.get("senderId"),
            "sender": sender,
            "pageName": input_data.get("pageName"),
            "isBrandInquiry": False,
            "confidence": 0.0,
            "reasoning": f"Classification error: {str(e)}",
            "keywords": [],
            "classifiedAt": datetime.datetime.now().isoformat()
        }
        # Pass through email threading metadata if available
        if source == "email":
            if input_data.get("inReplyTo"):
                emit_data["inReplyTo"] = input_data.get("inReplyTo")
            if input_data.get("references"):
                emit_data["references"] = input_data.get("references")
            if input_data.get("emailHeaders"):
                emit_data["emailHeaders"] = input_data.get("emailHeaders")
        
        await context.emit({
            "topic": "message.classified",
            "data": emit_data
        })

