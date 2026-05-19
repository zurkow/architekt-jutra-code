// Primary: Anthropic API (direct)
client<llm> AnthropicProvider {
  provider anthropic
  options {
    model "claude-haiku-4-5-20251001"
    api_key env.ANTHROPIC_API_KEY
  }
}

// Fallback: LiteLLM proxy (handles PII filtering via Presidio, observability via Langfuse)
// API key management lives in litellm/.env, not here.
client<llm> LiteLlmProvider {
  provider openai
  options {
    model "gpt-4o-mini"
    api_key env.LITELLM_API_KEY
    base_url "http://localhost:4000/v1"
  }
}

client<llm> LlmProvider {
  provider fallback
  options {
    strategy [AnthropicProvider, LiteLlmProvider]
  }
}
