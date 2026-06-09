# No runtime patching in tests

## What

We will avoid runtime patching (commonly but imprecisely known as mocking) in tests unless absolutely necessary.
By runtime patching we mean implicitly replacing an imported variable, class, member of a class, import, or any other runtime data with a fake version during the execution of a test.

Instead, when we need test doubles we will explicitly inject them as function arguments or during the construction of a class.
For objects we own we will provide an interface to program to and provide test doubles.
For objects we don't own (e.g. a DynamoDB client) we will write a thin wrapper which we can test using an externally provided stub or with a specialist stub we create ourseles
We will update old tests incrementally to remove instances of runtime patching from them.

## Why

Runtime patching is fragile because it couples tests with the file structure of the application.
Moving a class to a different file will often break tests because they refer to the location of the class in the filesystem, which makes it hard to find the issue using normal static IDE analysis tools or global string search.
It is also confusing and unintuitive because it does things "by magic" and the effects of patching are often felt away from where the patching happens.
For example, an exported dependency of a system under test (SUT) is patched at the top of a test file which replaces an object in a separate class file, which then affects the behaviour of a test 300 lines away in the same test file.
When a developer needs to fix or update that test suite 3 months after it was written they have to discover and understand all this
They might also have to find and fix a string path in the middle of the code if they've moved the object being patched.

The alternative to runtime patching is explicitly passing in dependencies to classes and function, and passing in test doubles explicitly during tests.
This requires programming to an interface instead of a specific class type - this has other benefits, like being able to easily swap out different implementations for a given service if for example we decide to change external dependencies.

## Consequences

- Updating tests in future will require more work to get rid of existing patching
- Working with new and updated test suites becomes easier and more robust
- We must program to an interface and be explicit about our dependencies
- We must provide test double implementations for classes we own
