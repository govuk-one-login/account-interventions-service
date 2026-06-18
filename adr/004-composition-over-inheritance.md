# Favour composition over inheritance

## What

When working with classes we will use composition in favour of inheritance by default.
Inheritance here includes the use of mixins and abstract classes.
Proposed use of inheritance must be discussed with the other developers on the team.

## Why

Plenty has been written about composition and inheritance and the consequences of each, which is probably not worth re-hashing here.
In general we prefer composition because it's a simple pattern that is applicable using the same approach in most circumstances, and it tends towards better testability via open implementations, interfaces and test doubles.
The primary downsides of composition tend to be proliferation of layers and some duplication of code, but we're making a judgment that the positives outweigh the negatives and we're better off having a strong default.
In general composition also lends itself better to ports-and-adapters design because of the more natural usage of interfaces.

Note that the intention of this ADR isn't to ban inheritance outright, but to mark composition as the default and set a certain bar to pass for any usage of inheritance.

## Consequences

- Decisions about design will be simpler
- In general the code will be more uniform
- Existing code using inheritance may require refactoring

## Notes
