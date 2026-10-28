FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags='-s -w' -o /out/touqi-api ./cmd/server

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata && addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY --from=build /out/touqi-api /app/touqi-api
COPY migrations /app/migrations
RUN mkdir -p /app/data/uploads && chown -R app:app /app
USER app
EXPOSE 80
ENTRYPOINT ["/app/touqi-api"]
