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

The first full E2E flow lives in `test/e2e/auth-flow.e2e-spec.ts`. It uses a
dedicated PostgreSQL database and the real auth service/repositories/guards.
Email delivery is mocked at the external-provider boundary.

Start isolated E2E infrastructure before running it:

`npm run test:e2e:up`

Then run:

`npm run test:e2e`

Stop and remove the isolated containers afterwards:

`npm run test:e2e:down`
