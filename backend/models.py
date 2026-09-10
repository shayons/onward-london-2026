"""Language-model selection for the Onward runtime.

The allowlist lives in deployed.json so the runtime, the local proxy and the browser read one
list, and a request can never point the runtime at a model its execution role cannot invoke.
"""
from strands.models import BedrockModel

from services import CONFIG, SESSION, SETTINGS

SELECTABLE_MODELS = SETTINGS.get('selectableModels') or {SETTINGS['modelId']: SETTINGS['modelId']}


def resolve_model_id(requested):
    """Return an allowlisted model id, falling back to the deployed default."""
    return requested if requested in SELECTABLE_MODELS else SETTINGS['modelId']


def language_model(model_id, max_tokens):
    """A Strands model for one call. Temperature stays at the provider default because current
    Claude models reject the parameter; determinism comes from the typed contract and the tools."""
    return BedrockModel(model_id=model_id, max_tokens=max_tokens,
                        boto_session=SESSION, boto_client_config=CONFIG)
