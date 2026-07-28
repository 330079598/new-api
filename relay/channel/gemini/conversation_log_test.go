package gemini

import (
	"testing"

	"github.com/QuantumNous/new-api/relaykit/dto"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGeminiResponseContentPreservesAllCandidateText(t *testing.T) {
	response := &dto.GeminiChatResponse{
		Candidates: []dto.GeminiChatCandidate{
			{Content: dto.GeminiChatContent{Parts: []dto.GeminiPart{{Text: "first"}, {Text: "second"}}}},
			{Content: dto.GeminiChatContent{Parts: []dto.GeminiPart{{Text: "third"}}}},
		},
	}

	require.Len(t, response.Candidates, 2)
	assert.Equal(t, "first\nsecond\nthird", geminiResponseContent(response))
}

func TestGeminiResponseContentHandlesMissingResponse(t *testing.T) {
	assert.Empty(t, geminiResponseContent(nil))
}
