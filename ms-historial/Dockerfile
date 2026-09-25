FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY go.mod ./
COPY main.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -o history-service .

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /src/history-service .
EXPOSE 3004
CMD ["./history-service"]