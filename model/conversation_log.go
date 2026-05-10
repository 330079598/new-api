package model

import (
	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	ConversationLogStatusStarted = "started"
	ConversationLogStatusSuccess = "success"
	ConversationLogStatusError   = "error"
)

type ConversationLog struct {
	Id              int    `json:"id" gorm:"index:idx_conversation_created_at_id,priority:1"`
	RequestId       string `json:"request_id" gorm:"type:varchar(64);uniqueIndex;default:''"`
	UserId          int    `json:"user_id" gorm:"index:idx_conversation_user_created,priority:1;index"`
	Username        string `json:"username" gorm:"index;default:''"`
	TokenId         int    `json:"token_id" gorm:"index:idx_conversation_token_created,priority:1;default:0"`
	TokenName       string `json:"token_name" gorm:"index;default:''"`
	ModelName       string `json:"model_name" gorm:"index;default:''"`
	ChannelId       int    `json:"channel_id" gorm:"index:idx_conversation_channel_created,priority:1;default:0"`
	Group           string `json:"group" gorm:"index;default:''"`
	RelayFormat     string `json:"relay_format" gorm:"default:''"`
	RequestPath     string `json:"request_path" gorm:"default:''"`
	IsStream        bool   `json:"is_stream"`
	Status          string `json:"status" gorm:"index;default:'started'"`
	RequestContent  string `json:"request_content" gorm:"type:text"`
	ResponseContent string `json:"response_content" gorm:"type:text"`
	ErrorMessage    string `json:"error_message" gorm:"type:text"`
	CreatedAt       int64  `json:"created_at" gorm:"bigint;index:idx_conversation_created_at_id,priority:2;index:idx_conversation_user_created,priority:2;index:idx_conversation_token_created,priority:2;index:idx_conversation_channel_created,priority:2"`
	UpdatedAt       int64  `json:"updated_at" gorm:"bigint"`
}

type RecordConversationLogParams struct {
	RequestId      string
	UserId         int
	Username       string
	TokenId        int
	TokenName      string
	ModelName      string
	ChannelId      int
	Group          string
	RelayFormat    string
	RequestPath    string
	IsStream       bool
	RequestContent string
}

func RecordConversationLog(params RecordConversationLogParams) {
	if params.RequestId == "" {
		return
	}
	if params.Username == "" && params.UserId > 0 {
		params.Username, _ = GetUsernameById(params.UserId, false)
	}
	if params.TokenName == "" && params.TokenId > 0 {
		if token, err := GetTokenById(params.TokenId); err == nil {
			params.TokenName = token.Name
		}
	}
	now := common.GetTimestamp()
	log := &ConversationLog{
		RequestId:      params.RequestId,
		UserId:         params.UserId,
		Username:       params.Username,
		TokenId:        params.TokenId,
		TokenName:      params.TokenName,
		ModelName:      params.ModelName,
		ChannelId:      params.ChannelId,
		Group:          params.Group,
		RelayFormat:    params.RelayFormat,
		RequestPath:    params.RequestPath,
		IsStream:       params.IsStream,
		Status:         ConversationLogStatusStarted,
		RequestContent: params.RequestContent,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := LOG_DB.Create(log).Error; err != nil {
		common.SysLog("failed to record conversation log: " + err.Error())
	}
}

type UpdateConversationLogParams struct {
	RequestId       string
	ChannelId       int
	ModelName       string
	IsStream        bool
	Status          string
	ResponseContent string
	ErrorMessage    string
}

func GetConversationLogByRequestId(requestId string) (*ConversationLog, error) {
	if requestId == "" {
		return nil, gorm.ErrRecordNotFound
	}
	log := &ConversationLog{}
	err := LOG_DB.Where("request_id = ?", requestId).First(log).Error
	return log, err
}

func UpdateConversationLog(params UpdateConversationLogParams) {
	if params.RequestId == "" {
		return
	}
	updates := map[string]interface{}{
		"updated_at": common.GetTimestamp(),
	}
	if params.ChannelId > 0 {
		updates["channel_id"] = params.ChannelId
	}
	if params.ModelName != "" {
		updates["model_name"] = params.ModelName
	}
	if params.Status != "" {
		updates["status"] = params.Status
	}
	if params.IsStream {
		updates["is_stream"] = true
	}
	if params.ResponseContent != "" {
		updates["response_content"] = params.ResponseContent
	}
	if params.ErrorMessage != "" {
		updates["error_message"] = params.ErrorMessage
	}
	if err := LOG_DB.Model(&ConversationLog{}).Where("request_id = ?", params.RequestId).Updates(updates).Error; err != nil && err != gorm.ErrRecordNotFound {
		common.SysLog("failed to update conversation log: " + err.Error())
	}
}
