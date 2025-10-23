#!/bin/bash

TOPIC="kill/updates/espIdTest"
BROKER="localhost"
PORT=1883

# Initialize smooth values
temperature=35
power=0
waterflow=10
count=0

# Helper to map temperature (25–50) → power (0–9.5)
map_power() {
  local temp=$1
  echo "scale=2; ($temp - 25) * (9.5 / 25)" | bc
}

while true; do
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
  mosquitto_pub -h "$BROKER" -p "$PORT" -t "$TOPIC" -m "$payload"

  echo "[$count] Sent: $payload"

  sleep 3
done

