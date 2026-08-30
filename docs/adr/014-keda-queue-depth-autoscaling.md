# ADR-014 — Optional KEDA queue-depth autoscaling

## Context

CPU is an incomplete scaling signal for RabbitMQ consumers. A service can have low CPU while queue backlog is growing.

## Decision

Keep resource HPA in the portable base and provide an optional KEDA overlay for Order, Driver and Dispatch based on RabbitMQ queue length.

## Consequences

- base manifests have no KEDA dependency;
- performance environments can scale from work backlog;
- the overlay must remove the corresponding CPU HPA to avoid two autoscalers owning one Deployment.
