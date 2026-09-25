FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY go.mod ./
COPY main.go ./
COPY cmd ./cmd
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o catalog-service .
RUN CGO_ENABLED=0 GOOS=linux go build -o catalog-seed ./cmd/seed

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /src/catalog-service .
COPY --from=builder /src/catalog-seed .
EXPOSE 3002
CMD ["./catalog-service"]