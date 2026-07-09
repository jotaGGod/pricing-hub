FROM golang:1.24-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /pricing-api ./cmd/api

FROM alpine:3.21

WORKDIR /app
COPY --from=builder /pricing-api /usr/local/bin/pricing-api
EXPOSE 8080
CMD ["pricing-api"]
