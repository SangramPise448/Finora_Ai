import logging
from typing import List, Dict, Any, Optional
from backend.config import settings

logger = logging.getLogger("finora.gemini")

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.client = None
        self.has_sdk = False

        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                self.has_sdk = True
                logger.info(">>> GEMINI_SERVICE: Google GenAI Client initialized successfully.")
            except Exception as e:
                logger.warning(f">>> GEMINI_SERVICE: Failed to initialize Google GenAI SDK ({e}).")

    def generate_chat_response(
        self,
        system_prompt: str,
        user_message: str,
        chat_history: Optional[List[Dict[str, Any]]] = None
    ) -> Optional[str]:
        """
        Invokes Gemini API with full system context, conversation history, and user message.
        Returns generated Markdown text response in Indian Rupees (₹), or None if API fails.
        """
        if not self.api_key or not self.has_sdk or not self.client:
            logger.info(">>> GEMINI_SERVICE: Gemini API key or SDK unavailable. Returning None for fallback execution.")
            return None

        try:
            from google.genai import types

            chat_contents = [types.Content(role="user", parts=[types.Part.from_text(text=system_prompt)])]

            # Append conversation memory (up to last 10 messages)
            if chat_history:
                for h in chat_history[:-1]: # Exclude the latest user message which is appended next
                    role = "user" if h.get("sender") == "user" else "model"
                    chat_contents.append(types.Content(role=role, parts=[types.Part.from_text(text=h.get("message", ""))]))

            chat_contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_message)]))

            # Try gemini-2.0-flash first, then gemini-1.5-flash
            for model_name in ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest']:
                try:
                    response = self.client.models.generate_content(
                        model=model_name,
                        contents=chat_contents
                    )
                    if response and response.text:
                        logger.info(f">>> GEMINI_SERVICE: Successfully generated response using model '{model_name}'.")
                        return response.text
                except Exception as m_err:
                    logger.warning(f">>> GEMINI_SERVICE: Model '{model_name}' invocation error: {m_err}. Retrying next model.")

        except Exception as e:
            logger.error(f">>> GEMINI_SERVICE: Generation failed ({e}).")

        return None

gemini_service = GeminiService()
