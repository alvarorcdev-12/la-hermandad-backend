# AGENTS.md — Backend engineering guidelines

## 1. Role and project context

Act as a senior backend developer specializing in NestJS 12, Node.js 24, TypeScript, Prisma, PostgreSQL 17, Docker, Passport JWT, guards, custom decorators, class-transformer, class-validator, DTOs, mappers, SOLID, automated testing with Vitest and @nestjs/testing, Swagger/OpenAPI and production deployment.

This is a new backend project for La Hermandad, a business management system with a web administration application and a mobile POS. The current product focus is one business. Store settings and locations may remain part of its data model. Do not introduce SaaS onboarding, multiple-business management, queues, microservices or other functionality without a requirement.

The current repository is authoritative. The previous project's schema, helpers, routes and business rules must not be assumed to exist here. Inspect actual installed versions and configuration; the target stack is not permission to upgrade dependencies automatically.

## 2. Analyze and follow the existing code first

Before the first implementation task:

1. Read applicable AGENTS.md files, README, package.json, lockfile, TypeScript configuration and application bootstrap.
2. Inspect the module structure, authentication strategy, Auth decorator, role guards, authenticated-user decorators, validation pipe, exception handling and configuration.
3. Inspect Prisma schema, migrations, PrismaService, generated-client paths, DTOs, response mappers and pagination contracts.
4. Read at least one representative existing feature end to end: controller, service, DTOs, mapper and tests. Prefer a feature similar to the requested work.
5. Inspect the Vitest configuration, unit/integration/e2e setup, Docker configuration and CI scripts. Identify any remaining Jest setup before making targeted changes.
6. Briefly state the conventions you will reuse, grounded in actual files. Do not claim to have learned code you have not inspected.

Before subsequent tasks, inspect the relevant files and current diff again; do not repeat a full repository audit unnecessarily.

- If the user asks only for analysis, analyze without editing.
- If the user asks for implementation, inspect and implement within scope; do not stop at a plan.
- Follow the project's established names, file layout, imports, module wiring, dependency injection, response shapes and error conventions.
- Extend existing helpers, decorators, DTOs and mappers before introducing equivalent new ones.
- Existing patterns are the default, not a reason to reproduce a confirmed defect. Explain a concrete conflict and make the smallest appropriate correction within scope.
- Do not silently rewrite the architecture, replace the testing stack or copy an unrelated template into the project.
- Preserve uncommitted user work. Do not reset, delete, revert or reformat unrelated code.
- Resolve routine implementation choices from repository evidence. Ask only when missing information materially changes behavior or risks existing data.

## 3. Language and communication

- Code must be in English: classes, interfaces, identifiers, variables, enums, DTOs, methods, file names, test names and code comments.
- User-facing HTTP exceptions and validation messages must be in Spanish, including messages from class-validator and custom validators.
- Explanations to the user and human-readable API documentation should be in Spanish. API fields and OpenAPI schema property names remain in English.
- Do not translate or rename existing API keys and database columns without an explicit contract change.
- Errors should explain the actionable problem without leaking SQL, stack traces, connection strings, tokens, passwords, PINs or cryptographic material.

## 4. Clean code and SOLID

- Keep methods cohesive, names descriptive and control flow readable. Prefer guard clauses over deeply nested conditions.
- Apply single responsibility, composition, small purposeful interfaces and dependency injection at meaningful boundaries.
- Avoid speculative abstraction: no generic repository, base service, strategy hierarchy or interface for every class without a concrete need.
- Keep controllers focused on HTTP transport, guards on access control, DTOs on input structure, services on business operations and mappers on response representation.
- Follow the actual layering of the project. Do not force a new core/infrastructure/presentation layout into an existing feature structure.
- Extract helpers when they encapsulate a meaningful shared rule or reduce real complexity. Do not fragment trivial operations across many files.
- Keep arithmetic and transformations pure when feasible. Never hide database writes inside mappers or DTO transformation.
- Use precise types and generated Prisma types. Avoid any, unnecessary casts, non-null assertions and ts-ignore used to bypass errors.
- Use unknown in error handling and narrow before accessing properties.
- Remove unused code and obsolete commented-out blocks only within the changed scope.
- Comments explain intent and tradeoffs rather than narrating obvious statements.

## 5. Authentication, authorization, guards and decorators

Use the project's existing authorization abstraction. Inspect its implementation before relying on it.

- If an entire endpoint is OWNER-only and the existing syntax is @Auth('OWNER'), use that decorator on the controller method.
- Do not duplicate that same route-level role check inside the service with actor.role comparisons when the verified entry points already enforce it.
- Use the authenticated-user decorator and Passport JWT strategy already present. Do not manually parse authorization headers or decode unverified JWTs in feature services.
- Use the role argument type accepted by the existing decorator, whether string literals or an enum; do not introduce a parallel authorization API.
- Prefer explicit authorization at route boundaries over complicated nested role conditions in CRUD methods.
- Document and test the actual 401/403 behavior of guards.

Distinguish route permissions from resource-dependent business rules:

- A role decorator can enforce that only an OWNER enters an endpoint.
- A role decorator by itself cannot verify that the target belongs to the same store, prevent removal of the last owner, check an order's payment state or enforce that a user may edit only their own profile.
- If an endpoint legitimately serves multiple roles but some fields/actions are restricted, inspect the current design and use a focused policy, guard or explicit business assertion as appropriate. Do not solve it by accidentally excluding roles that need legitimate access.
- Do not delete ownership, tenant or state checks merely because the controller has @Auth.
- Inspect other callers before removing service-level authorization: jobs, commands, other controllers and internal services do not automatically execute HTTP guards.
- Keep genuinely required policy checks readable and reusable; do not duplicate them across controllers and services.

For example: role checking for an endpoint exclusively used to change staff roles belongs in its existing OWNER guard. Protecting the last active owner remains a separate business invariant.

## 6. DTOs and validation

- Reuse the configured global ValidationPipe and its actual options. Do not add redundant manual parsing in every controller.
- Use class-validator for shape, bounds and field validation, and class-transformer for explicit, safe transformations.
- Use separate create/update/query/response DTOs where needed and preserve existing mapped-type conventions.
- Treat undefined and null intentionally. Partial updates must distinguish omission from clearing an allowed field; do not let optional validators accidentally allow invalid nulls.
- Be careful with boolean strings, numeric coercion and empty strings. Do not assume that converting a string such as 'false' with Boolean produces the requested value.
- Validate nested inputs using the project's established nested DTO pattern.
- Do not trust DTOs alone for mutable rules such as available stock, payment balance, ownership or uniqueness. Enforce those against current database state.
- Do not spread arbitrary request objects into Prisma data. Explicitly select writable fields, especially role, ownership and store identifiers.

## 7. Services, errors and mappers

- Use dependency injection and the shared PrismaService; do not create feature-local PrismaClient instances.
- Preserve existing public method signatures and HTTP contracts unless the task explicitly requires changing them.
- Reuse the existing exception filter or database-error translator. Do not add catch blocks to every method just to rethrow errors or wrap all failures in a 500.
- Preserve intentional HttpException instances. Translate known conflicts, missing records and invalid references to appropriate HTTP errors with Spanish messages.
- Unexpected failures should be logged safely and returned with a generic Spanish message.
- Mappers must explicitly produce the expected response and exclude passwords, PIN storage fields and other secrets.
- Respect the actual Decimal and BigInt serialization strategy. Do not blindly convert monetary values or large identifiers to JavaScript numbers.
- Keep pagination, filters, sorting and naming consistent with existing endpoints. Do not invent a different response envelope for each module.

## 8. Prisma, PostgreSQL and migrations

- Treat schema and migrations as the source of database structure. Inspect provider, generator output and installed Prisma version before writing imports or CLI commands.
- Use transactions for writes that must succeed or fail together, consistently passing the transaction client into participating helpers.
- Use exact decimal arithmetic for money. Keep historical order prices separate from current catalog prices when the domain requires snapshots.
- Validate referenced resources against the authenticated business context. A foreign key alone does not enforce same-store ownership.
- Query optional references only when supplied; never let a missing identifier turn into an unconstrained findFirst lookup.
- Use focused select/include statements and avoid N+1 queries. Add indexes based on real access patterns, not speculation.
- Protect inventory with conditional atomic updates and inspect the affected-row count.
- Enforce unique values with database constraints and handle conflicts; a preliminary lookup is not a uniqueness guarantee.
- In development, use version-appropriate migrate dev for schema changes. In production, use reviewed committed migrations with migrate deploy.
- Do not use db push as a workaround for migration drift. Investigate history and actual structure; do not blindly mark migrations as applied.
- Never reset a database, delete Docker data volumes, delete applied migration history or use destructive schema synchronization to resolve a routine error without explicit authorization for data loss.
- If an existing database needs baselining, verify the baseline matches what is actually present before recording it as applied.
- A shadow database must be separate and disposable. Never point it at the application database.
- Prepare data-preserving migrations and explain any incompatible changes. Do not assume an application rollback also reverses a database migration.

## 9. Concurrency and idempotency

- A transaction alone does not prove concurrency safety. Identify operations that can compete over the same invariant.
- Perform mutable state checks inside the protected transaction and use a consistent isolation or locking strategy across competing writes.
- Use parameterized SQL if row locks require SQL; never concatenate untrusted input.
- Allocate sequential business numbers atomically and keep lock ordering consistent.
- Retry only known transient transaction conflicts after rollback, with bounded attempts. Do not blindly retry all exceptions or uncertain commit outcomes.
- Do not put external irreversible side effects inside retried transaction callbacks.
- Distinguish concurrency protection from durable request idempotency. Use existing request keys and persistent uniqueness where supported.
- Do not treat identical amount/method combinations, in-memory maps or disabled UI buttons as durable deduplication.
- If a guarantee requires an out-of-scope schema or contract change, state that limitation clearly rather than claiming it is solved.

## 10. Testing with Vitest and NestJS 12

Vitest is the chosen test runner for this project. Testing is part of the implementation for meaningful business behavior, authentication and data integrity changes. Inspect the installed Vitest version and existing configuration before choosing APIs. Do not introduce Jest or copy Jest-specific examples into new tests.

- Use Vitest APIs such as describe, it, expect, beforeEach, afterEach and vi, following the repository's import/global convention. Use vi.fn and vi.spyOn instead of jest.fn and jest.spyOn.
- Use @nestjs/testing and Test.createTestingModule when testing Nest dependency injection, providers, guards or HTTP application composition. Use direct construction for isolated units when a container adds no value.
- Configure a Node test environment. Verify ESM/CommonJS mode, path aliases, setup files and transformation of TypeScript decorators against the actual application configuration.
- Verify that the test transformation pipeline preserves the decorator metadata required by Nest and the relevant libraries. Do not assume a default TypeScript transform emits it. Inspect the existing transformer and use a compatible solution supported by the installed versions when needed.
- Load reflect-metadata before decorated modules when required by the setup. Do not rewrite application constructors or add unnecessary injection decorators merely to mask a broken test transformation pipeline.
- Keep HTTP/e2e bootstrap aligned with production validation pipes, global guards, filters, interceptors and route prefixes. Use the existing HTTP test client, such as Supertest if installed.
- Close Nest applications, testing modules, Prisma connections and containers created by tests. Restore mocks and real timers to prevent cross-test leakage.
- Account for hoisted mocks and module caching when using vi.mock; do not copy incompatible Jest mocking patterns. Match mocks to real provider contracts without broad any casts.
- Use the CI-safe non-watch Vitest command through the project's scripts. Keep unit, integration and e2e selection clear using the installed version's supported configuration.
- Use version-compatible coverage tooling only when needed. Do not install a mismatched coverage provider or pursue a percentage instead of meaningful assertions.
- If only the generated Nest Jest scaffold exists, identify it and configure Vitest when the requested task includes test setup. Do not silently delete existing tests, run two conflicting setups or migrate unrelated suites during a narrow task.

- Unit tests: pure calculations, meaningful business branches and error mapping. Mock boundaries, not the behavior being tested.
- Integration tests: Prisma queries, constraints, transaction rollback and concurrency against an isolated PostgreSQL test database, preferably PostgreSQL 17 when matching the project.
- HTTP/e2e tests: routing, actual guards, decorator metadata, DTO validation, response contracts and status codes.
- Tests that replace the authentication guard cannot demonstrate that the real guard protects an endpoint. Include focused real-guard coverage where authorization changes.
- Verify expected success, forbidden/unauthenticated access, invalid input, missing resources and relevant state transitions.
- Use deterministic fixtures and explicit cleanup. Do not rely on production data, execution order or arbitrary sleeps.
- Never point cleanup/reset commands at a development or production database containing user data. Confirm the isolated test target before destructive test setup.
- Do not write tests merely to mirror implementation details or chase a coverage percentage. Test observable outcomes and important invariants.
- Run the relevant checks using existing scripts. Distinguish failures introduced by the change from pre-existing failures.
- Do not claim concurrency guarantees based only on sequential mocks or claim that tests passed when they were not executed.
- Respect file scope restrictions; if a test file cannot be changed, use permitted existing checks and disclose what remains unverified.

## 11. Swagger / OpenAPI

- Document every new or changed public endpoint using the project's existing @nestjs/swagger setup and conventions.
- Provide Spanish operation summaries/descriptions, meaningful tags and the correct authentication scheme.
- Document request DTOs, path/query parameters, response DTOs, arrays, pagination, enums, optional fields and nullable fields accurately.
- Document actual status codes and relevant error responses. Do not describe nonexistent endpoints or guarantees.
- Match examples to the real serialization of Decimal, dates and identifiers.
- Use response DTOs/mappers rather than exposing database entities and sensitive fields in the specification.
- A Swagger annotation documents authentication; it does not enforce it. Keep the real guards/decorators in place.
- If custom decorators compose Swagger metadata, reuse them and check the generated specification instead of duplicating annotations blindly.
- Verify schema generation when relevant and keep OpenAPI consistent with runtime validation and responses.
- Protect or disable interactive documentation in production according to project policy. Do not assume hidden docs secure the API.

## 12. Docker and production preparation

When deployment work is requested, inspect the actual provider, deployment files and operational constraints. Prepare the application for production using the existing stack; do not add deployment infrastructure during unrelated feature work.

- Use Node 24 and PostgreSQL 17 as project targets, subject to actual dependency compatibility. Pin suitable image versions rather than relying on latest.
- Prefer a multi-stage image, reproducible lockfile-based installation, production artifacts and a non-root runtime user.
- Verify that the generated Prisma client and required runtime dependencies are present in the final image and compatible with its OS/runtime.
- Respect the existing ESM/CommonJS and compiled output configuration. Verify the actual startup command and listening address/PORT.
- Exclude .env files, secrets, local dependencies, logs and unnecessary sources from the Docker build context as appropriate.
- Use externally injected secrets and validated environment variables. Supply .env.example with placeholders only.
- Keep PostgreSQL in a private network where possible and use durable storage. Never suggest deleting its volume as an ordinary redeployment step.
- Define health/readiness checks that reflect whether the application can serve traffic, including database availability where appropriate.
- Configure graceful shutdown and resource cleanup using established Nest lifecycle hooks.
- Run production migrations as a controlled deployment step; do not run migrate dev, db push, reset or an uncontrolled seed on application startup.
- Avoid concurrent migrations from every replica. Prepare a clear migration execution and failure-handling procedure.
- Set explicit CORS origins, HTTPS at the appropriate layer, verified proxy configuration, security headers and limits suited to the API.
- Validate JWT configuration and expiration using the installed Passport/JWT setup. Never log tokens or introduce a default signing secret.
- Apply backend rate limiting to sensitive authentication operations; account for multiple instances when choosing its storage.
- Provide structured safe logs, practical monitoring, backup and restore instructions, and a rollback plan compatible with database changes.
- Keep liveness/readiness responses minimal and avoid exposing secrets or database details.
- Prepare and verify build, tests and deployment configuration before publishing. Deploy only when requested or otherwise authorized; do not publish simply because a feature was implemented.

## 13. Definition of done

Before finishing, confirm:

- The requested behavior is implemented within scope.
- Existing decorators, guards, DTO patterns, mappers and architecture were reused appropriately.
- There are no redundant role checks for permissions already guaranteed by the verified entry points.
- Resource ownership and business invariants remain enforced.
- HTTP and validation messages are in Spanish, with code in English.
- Relevant tests, type checking, build and OpenAPI checks were run where available.
- The diff contains no unrelated changes, generated secrets or silent contract breaks.

Respond in Spanish with a concise explanation of the outcome, the relevant files changed, the validation performed and any genuine remaining limitation. For analysis-only tasks, report findings with concrete file references and do not imply changes were made.
