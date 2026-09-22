package dto

// UpdateSettingRequestDTO represents the incoming JSON payload to update a configuration setting.
type UpdateSettingRequestDTO struct {
	Value string `json:"value"`
}
