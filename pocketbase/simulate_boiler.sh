#!/bin/bash

ESP_ID="ESPIDTEST"
PUBLISH_TOPIC="kill/updates/$ESP_ID"
COMMAND_TOPIC="kill/commands/$ESP_ID"
BROKER="localhost"
PORT=1883

# Initialize smooth values
temperature=35
power=0
waterflow=10
count=0

# Control flag: 1 = publishing enabled, 0 = paused
PUBLISHING_ENABLED=1

# Cleanup function
cleanup() {
  echo "Cleaning up..."
  kill $(jobs -p) 2>/dev/null
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Helper to map temperature (25–50) → power (0–9.5)
map_power() {
  local temp=$1
  echo "scale=2; ($temp - 25) * (9.5 / 25)" | bc
}

# Start subscriber in background (non-blocking read)
echo "🔗 Subscribing to $COMMAND_TOPIC for commands..."
exec 3< <(mosquitto_sub -h "$BROKER" -p "$PORT" -t "$COMMAND_TOPIC")

# Main loop
while true; do
  # Try reading one command (non-blocking)
  if read -t 1 command <&3; then
    case "$command" in
      off|OFF)
        if [ $PUBLISHING_ENABLED -eq 1 ]; then
          PUBLISHING_ENABLED=0
          echo "⏸️  Publishing STOPPED (received: $command)"
        fi
        ;;
      on|ON)
        if [ $PUBLISHING_ENABLED -eq 0 ]; then
          PUBLISHING_ENABLED=1
          echo "▶️  Publishing RESUMED (received: $command)"
        fi
        ;;
      toggle|TOGGLE)
        if [ $PUBLISHING_ENABLED -eq 1 ]; then
          PUBLISHING_ENABLED=0
          echo "⏸️  Publishing STOPPED (received: $command)"
        else
          PUBLISHING_ENABLED=1
          echo "▶️  Publishing RESUMED (received: $command)"
        fi
        ;;
      *)
        echo "⚠️  Unknown command: $command"
        ;;
    esac
  fi

  # Only publish if enabled
  if [ $PUBLISHING_ENABLED -eq 1 ]; then
    # Smooth random change: add small delta between -0.5 and +0.5
    delta_temp=$(awk -v min=-0.5 -v max=0.5 'BEGIN{srand(); print min+rand()*(max-min)}')
    delta_flow=$(awk -v min=-0.5 -v max=0.5 'BEGIN{srand(); print min+rand()*(max-min)}')

    # Update values and clamp ranges
    temperature=$(awk -v t=$temperature -v d=$delta_temp -v min=25 -v max=50 'BEGIN{v=t+d; if(v<min)v=min; if(v>max)v=max; print v}')
    waterflow=$(awk -v f=$waterflow -v d=$delta_flow -v min=2 -v max=25.5 'BEGIN{v=f+d; if(v<min)v=min; if(v>max)v=max; print v}')

    # Compute power
    power=$(map_power $temperature)

    # Format payload
    payload=$(printf "%.2f,%.2f,%.2f" "$temperature" "$power" "$waterflow")

    # Increment counter
    ((count++))

    # Publish
    mosquitto_pub -h "$BROKER" -p "$PORT" -t "$PUBLISH_TOPIC" -m "$payload"

    echo "[$count] 📤 Sent: $payload"

    sleep 3
  else
    sleep 0.5
  fi
done
