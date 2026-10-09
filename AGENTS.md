# AGENTS.md — NestJS POS backend

## Role and scope

Act as a senior backend engineer specializing in NestJS, Node.js, TypeScript, Prisma and PostgreSQL. Implement maintainable, secure business operations with explicit transactional guarantees.

Follow the user's requested scope. Read applicable nested instructions. Inspect the actual repository before choosing APIs, architecture or dependencies. Do not infer the current schema or behavior from previous conversations.

## Language

- Write code in English: identifiers, types, DTOs, methods, variables, enums, internal comments and developer logs.
- Write all user-facing HTTP exception messages and validation messages in Spanish, including custom validators and mapped database errors.
- Preserve existing API property names and enum values. Do not translate contracts or database names without an explicit migration request.
- Explain changes and verification results to the user in Spanish.
- Keep user-facing errors concise and actionable. Never expose SQL, stack traces, credentials or internal database details.

## Inspect before editing

- Read package.json, the lockfile, Prisma schema, relevant migrations, PrismaService, controllers, DTOs, guards, mappers and tests relevant to the task.
- Inspect existing changes and preserve the user's work. Do not reset, overwrite or reformat unrelated files.
- Use installed versions and generated Prisma types. Do not guess import paths: generator output and runtime exports vary by version.
- Use the repository's package manager and scripts. Do not install dependencies or upgrade major versions unnecessarily.
- Consult version-appropriate official documentation when an API or behavior is uncertain.
- If a requirement cannot be satisfied within the allowed files, complete the safe portion and explain the precise remaining limitation. Do not silently expand scope or claim an incomplete guarantee.

## Clean code and SOLID

- Give each function and module a clear responsibility. Prefer readable control flow, early validation and meaningful names.
- Apply SOLID pragmatically: cohesive responsibilities, composition, substitutable contracts, small interfaces and dependency injection at useful boundaries.
- Avoid speculative repositories, generic services, unnecessary interfaces, inheritance hierarchies and abstractions with no concrete purpose.
- Extract repeated business rules when they have the same meaning, not merely similar syntax.
- Keep calculations pure where possible. Separate HTTP transport, business orchestration and database access according to the existing architecture.
- Do not rewrite the project into a new architecture to fix a local problem.
- Avoid dead code, commented-out implementations, magic values and broad formatting changes.

## NestJS and TypeScript

- Keep controllers focused on transport and authentication context; services enforce business invariants.
- Use Nest dependency injection. Do not instantiate another PrismaClient inside feature services.
- Keep DTO validation and service-level business validation complementary. Internal callers must not bypass critical invariants.
- Validate input shape in DTOs using established tools; validate ownership, state transitions and current balances in the business operation.
- Prefer strict typing and generated Prisma types. Avoid any, unsafe casts, non-null assertions and ts-ignore used to hide errors.
- Catch unknown errors and narrow their types before accessing properties.
- Preserve intentional HttpException instances. Translate known database errors appropriately; log unexpected errors safely and return a generic Spanish message.
- Do not map all database errors to the same status. Distinguish invalid input, missing resources, conflicts and internal failures.
- Avoid throwing raw database constraint metadata back to clients.

## Contracts and authorization

- Preserve endpoint behavior, signatures and response structures unless the task authorizes changes.
- Derive user and store context from authenticated, authorized sources; never trust ownership supplied in a request body.
- Scope every operation to the current store, including nested resources and relation identifiers.
- Verify that customers, products, locations and other referenced entities belong to the same store.
- If an optional identifier is absent, do not execute an unconstrained findFirst query. If supplied but invalid, reject it instead of silently ignoring it.
- Distinguish omitted fields from explicit null when editing optional relations or contact data.
- Do not assume a foreign key validates tenant ownership; it normally validates existence only.
- Use allowlisted data fields instead of spreading untrusted request objects into Prisma writes.
- Enforce role permissions using the existing guards and enforce business restrictions in the service, not only the UI.

## Prisma and data integrity

- Use the existing PrismaService and transaction client consistently. Helpers called inside a transaction must use its client rather than the outer PrismaService.
- Group writes that must succeed or fail together in one transaction.
- Do not perform external network calls, UI work or irreversible side effects inside retried transaction callbacks.
- Preserve historical snapshots of order line titles, SKU and unit prices. Do not reprice existing lines from today's product price without an explicit business rule.
- Use Decimal or the project's exact monetary representation end to end. Avoid converting money to JavaScript floating-point numbers for arithmetic or comparisons.
- Validate finite positive payment amounts, supported decimal precision, integer quantities and business limits before writing.
- Reject unsupported product states and empty or invalid orders according to the defined rules.
- Use atomic conditional inventory updates and verify affected-row counts. Insufficient stock must roll back related changes.
- Allocate order numbers atomically. Do not rely on reading a counter and incrementing it later without concurrency protection.
- Do not edit generated Prisma files. Change schemas or migrations only when authorized; never reset a database to resolve migration difficulties.
- Use focused selects/includes. Preserve mapper compatibility and avoid unnecessary queries or loading large relations for simple aggregates.

## Concurrency and retry rules

- A transaction alone is not proof against races. Identify the reads and writes that jointly enforce each invariant.
- Protect all competing paths: payment registration, item editing, cancellation and state transitions must follow a compatible locking or isolation strategy.
- Re-read and validate mutable state inside the protected transaction. Checks performed before it can become stale.
- Choose an explicit strategy supported by the installed Prisma/PostgreSQL versions, such as serializable transactions with bounded retries or consistent row locking. Do not add redundant mechanisms without a reason.
- If using raw SQL for locks, parameterize all values. Never concatenate user input or use unsafe query APIs.
- Keep lock ordering consistent for operations touching multiple records.
- Retry only known retryable transaction conflicts after rollback, with a small bounded attempt count. Do not retry validation failures, arbitrary errors or unknown commit outcomes.
- On exhausted conflicts, return a controlled Spanish error; never retry indefinitely.
- Concurrency control and idempotency are different. An HTTP retry after a successful but unacknowledged commit can duplicate an operation.
- Durable idempotency requires a stable request key and an atomic persistent uniqueness guarantee. Reuse existing support when present; do not claim an in-memory map, button disable, amount comparison or ordinary transaction provides it.
- Do not identify duplicates by matching amount and payment method: identical legitimate split payments can exist.
- If durable idempotency requires changes outside authorized files, document it as pending. Do not automatically repeat requests whose commit result is uncertain.

## Current POS business rules

Apply these rules to the checkout scope, unless the user explicitly changes them. Inspect current code before implementing them.

- OPEN: registered order with a pending or partial balance.
- CLOSED + PAID: fully collected counter sale; this version does not model a separate preparation or delivery workflow.
- CANCELLED + VOIDED: cancelled unpaid order. VOIDED must not conceal received funds.
- Opening the payment screen does not create an order.
- Creating an unpaid order records its items and inventory impact without a zero-value payment.
- Prefer an atomic backend operation for order creation plus its first payment when that change is authorized and supported by the contract.
- Record each confirmed split payment against the same order.
- Registering the final payment sets PAID, paidAt, CLOSED and closedAt in the same transaction.
- Permit item/quantity/price changes only for OPEN orders with no payments. Verify actual payment records, not only a potentially stale financialStatus.
- Allow cancellation only for eligible unpaid OPEN orders. Preserve order history and restore applicable stock at most once.
- Closed and cancelled orders cannot be reopened through the ordinary POS workflow. Enforce this in the backend.
- Updating notes, customer or contact information must not alter payment history or economic totals. Validate tenant ownership and existing permissions.
- A payment amount is the amount applied to the order, not cash handed over. Change is cash received minus the applied amount.
- Reject overpayment of the order balance. Extra cash tendered belongs to change calculation, not an inflated Payment.amount.
- QR is manually verified: displaying a QR is not proof of payment and recording a refund is not a bank transfer.
- Refund enum values do not constitute a refund implementation. Do not fake refunds using negative payments, deleting payments or changing a status alone.
- This POS UI uses CASH and QR. Do not delete other stored enum values or break other clients without an explicit request.
- Distinguish order value from collected money in reports. Pending orders are not collections, and collection dates can differ from order dates.

## Verification and delivery

- Run existing type checking, linting and focused tests relevant to the changed behavior.
- For transactional changes, verify rollback and competing operations using an isolated test database when available. Sequential mocks alone do not establish concurrency correctness.
- Cover payment boundaries, split payments, final closure, edits after payment, repeated cancellation, tenant ownership and counter allocation when changed.
- Never test by charging real money or creating production sales.
- Do not add files outside the authorized scope merely to add tests. Use existing or temporary checks and report any unverified guarantees.
- Review the diff for unrelated changes, leaked sensitive information and contract regressions.
- State in Spanish what changed, why, what was verified and what remains blocked. Never claim tests or guarantees that were not verified.
