/* eslint-disable */
import esbuild from 'esbuild'
import { readFileSync } from 'fs'
import { join } from 'path'
import { yamlParse } from 'yaml-cfn'

const SAM_TEMPLATE_DIR = './src/infra/main/template.yaml';


interface IAwsResource {
  Type: string
}

interface ILambdaFunction extends IAwsResource {
  Properties: {
    CodeUri: string
  }
}

const lambdasPath = 'src/handlers'

const { Resources } = yamlParse(readFileSync(join(__dirname, SAM_TEMPLATE_DIR), 'utf-8'));


const awsResources = Object.values(Resources) as IAwsResource[]

const lambdas = awsResources.filter(
  (resource) => resource.Type === 'AWS::Serverless::Function'
) as ILambdaFunction[]

const entries = lambdas.map((lambda) => {
  const lambdaNameArr = lambda.Properties.CodeUri.split('/');
  const lambdaName = lambdaNameArr[lambdaNameArr.length-1];
  console.log()
  return `./${lambdasPath}/${lambdaName}.ts`
})
for (const entry of entries){
  const subFolder = entry.split('/')[3]!.replaceAll('.ts', '');
  console.log(entry);
  esbuild.build(
    {
      bundle: true,
      entryPoints: [entry],
      logLevel: 'info',
      minify: true,
      platform: 'node',
      outdir: `dist/${subFolder}`,
      //outbase: 'src/handlers',
      //sourcesContent: false,
      tsconfig: './tsconfig.json',
      //target: 'node20.11.0'
    }
  ).catch((error) => {
    console.log(error);
    process.exit(1);
  })
}
// esbuild
//   .build({
//     bundle: true,
//     entryPoints: entries,
//     logLevel: 'info',
//     minify: true,
//     platform: 'node',
//     outdir: `dist/`,
//     outbase: 'src/handlers',
//     sourcesContent: false,
//     sourcemap: true,
//     target: 'es2022'
//   })
//   .catch(() => process.exit(1))
