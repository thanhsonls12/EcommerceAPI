# Test layers

This project keeps different test scopes separate so their guarantees are clear.

## Unit tests

Run `npm test`.

Unit tests cover service business logic with mocked dependencies.

## HTTP integration tests

Run `npm run test:http`.

Files ending in `.http-spec.ts` exercise Nest HTTP routing, DTO validation,
controller wiring, request/response handling, and response serialization where
configured. Business services and infrastructure dependencies are mocked.

These tests are intentionally not described as end-to-end tests.

## End-to-end tests

Run `npm run test:e2e`.

True E2E tests belong under `test/e2e/` and should boot the application with
real authentication/authorization and the real business-service path. Database
and Redis test infrastructure should use isolated test instances. External
providers such as email and payment gateways may be replaced at their system
boundary.

There are currently no full E2E test cases in this directory. The E2E command
therefore succeeds with zero tests until the first isolated full-flow test is
added.
