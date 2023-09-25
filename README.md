

``` bash
$ npm install
$ npm start
```
(`npm install` might error about Snyk if it’s not set up but ignore for now)

Then go to [http://localhost:3000/](http://localhost:3000/) to see it in action.

### Using nvm (optional)
If you work across multiple Node.js projects there's a good chance they require different Node.js and npm versions.

To enable this we use [nvm (Node Version Manager)](https://github.com/creationix/nvm) to switch between versions easily.

1. [install nvm](https://github.com/creationix/nvm#installation)
2. Run `nvm install` in the project directory (this will use [.nvmrc](/../../.nvmrc))
3. Follow the steps above to install and start

[Express]: https://expressjs.com/
[Nunjucks]: https://mozilla.github.io/nunjucks/
[Snyk]: https://snyk.io/
[GOV.UK Frontend]: https://design-system.service.gov.uk/
[Browserify]: http://browserify.org/
[StandardJS]: https://standardjs.com/
[nvm]: https://github.com/creationix/nvm
