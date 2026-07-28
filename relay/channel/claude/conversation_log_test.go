package claude

import (
	"testing"

	"github.com/QuantumNous/new-api/relaykit/dto"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestClaudeResponseContentPreservesCompletionTextAndThinking(t *testing.T) {
	text := "complete answer"
	thinking := "reasoning details"
	response := &dto.ClaudeResponse{
		Completion: "legacy completion",
		Content: []dto.ClaudeMediaMessage{
			{Text: &text},
			{Thinking: &thinking},
		},
	}

	require.Len(t, response.Content, 2)
	assert.Equal(
		t,
		"legacy completion\ncomplete answer\nreasoning details",
		claudeResponseContent(response),
	)
}

func TestClaudeResponseContentHandlesMissingResponse(t *testing.T) {
	assert.Empty(t, claudeResponseContent(nil))
}
