package service

import (
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/types"

	"github.com/gin-gonic/gin"
)

const conversationLogMaxContentRunes = 20000

func ShouldRecordConversationLog(info *relaycommon.RelayInfo) bool {
	if info == nil {
		return false
	}
	switch info.RelayMode {
	case relayconstant.RelayModeChatCompletions, relayconstant.RelayModeCompletions, relayconstant.RelayModeResponses, relayconstant.RelayModeGemini:
		return true
	default:
		return false
	}
}

func RecordConversationRequest(ctx *gin.Context, info *relaycommon.RelayInfo, request dto.Request) {
	if !ShouldRecordConversationLog(info) || request == nil {
		return
	}
	requestBytes, err := common.Marshal(request)
	if err != nil {
		common.SysLog("failed to marshal conversation request: " + err.Error())
		return
	}
	requestPath := ""
	if ctx != nil && ctx.Request != nil && ctx.Request.URL != nil {
		requestPath = ctx.Request.URL.Path
	} else if info.RequestURLPath != "" {
		requestPath = info.RequestURLPath
		if idx := strings.Index(requestPath, "?"); idx >= 0 {
			requestPath = requestPath[:idx]
		}
	}
	model.RecordConversationLog(model.RecordConversationLogParams{
		RequestId:      info.RequestId,
		UserId:         info.UserId,
		Username:       contextString(ctx, "username"),
		TokenId:        info.TokenId,
		TokenName:      contextString(ctx, "token_name"),
		ModelName:      info.OriginModelName,
		ChannelId:      info.ChannelId,
		Group:          info.UsingGroup,
		RelayFormat:    string(info.RelayFormat),
		RequestPath:    requestPath,
		IsStream:       info.IsStream,
		RequestContent: truncateConversationContent(string(requestBytes)),
	})
}

func RecordConversationResponse(ctx *gin.Context, info *relaycommon.RelayInfo, responseContent string) {
	if !ShouldRecordConversationLog(info) {
		return
	}
	model.UpdateConversationLog(model.UpdateConversationLogParams{
		RequestId:       info.RequestId,
		ChannelId:       info.ChannelId,
		ModelName:       info.UpstreamModelName,
		IsStream:        info.IsStream,
		Status:          model.ConversationLogStatusSuccess,
		ResponseContent: truncateConversationContent(responseContent),
	})
}

func RecordConversationError(ctx *gin.Context, info *relaycommon.RelayInfo, apiErr *types.NewAPIError) {
	if !ShouldRecordConversationLog(info) || apiErr == nil {
		return
	}
	model.UpdateConversationLog(model.UpdateConversationLogParams{
		RequestId:    info.RequestId,
		ChannelId:    info.ChannelId,
		ModelName:    info.UpstreamModelName,
		IsStream:     info.IsStream,
		Status:       model.ConversationLogStatusError,
		ErrorMessage: truncateConversationContent(apiErr.MaskSensitiveErrorWithStatusCode()),
	})
}

func contextString(ctx *gin.Context, key string) string {
	if ctx == nil {
		return ""
	}
	return ctx.GetString(key)
}

func truncateConversationContent(content string) string {
	if utf8.RuneCountInString(content) <= conversationLogMaxContentRunes {
		return content
	}
	runes := []rune(content)
	return string(runes[:conversationLogMaxContentRunes]) + "\n...[truncated]"
}
