package core

import "errors"

var (
	ErrInvalidInput      = errors.New("entrada invalida")
	ErrNotFound          = errors.New("registro nao encontrado")
	ErrUnauthorized      = errors.New("nao autorizado")
	ErrConflict          = errors.New("registro ja existe")
	ErrImpossibleMargin  = errors.New("margem desejada impossivel com os custos informados")
	ErrInvalidCredential = errors.New("email ou senha invalidos")
)
