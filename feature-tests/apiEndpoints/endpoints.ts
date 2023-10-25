export default class EndPoints {
  public static TOKEN_GENERATOR_DOMAIN = `https://mock.credential-store.${process.env.TEST_ENVIRONMENT}.account.gov.uk`;
  public static BASE_URL =
    process.env.TEST_ENVIRONMENT === 'dev'
      ? `https://${process.env.SAM_STACK_NAME}.credential-store.${process.env.TEST_ENVIRONMENT}.account.gov.uk`
      : process.env.CFN_PrivateApiEndpoint;
  public static TOKEN_GENERATOR_PATH = '/generate';
  public static INVALID_PATH_GENERATE_TOKEN = '/generates';
  public static PATH_VCS = '/vcs/';
  public static SUMMARISE_VCS = '/summarise-vcs/';
  public static INVALID_SUMMARISE_VCS = '/sumarise-vcs/';
  public static INVALID_PATH_VCS = '/vcs//';
  public static BASE_SECRET_NAME =
    process.env.TEST_ENVIRONMENT === 'dev'
      ? `/${process.env.SAM_STACK_NAME}/Config/API/Key/`
      : `/id-reuse-storage-core/Config/API/Key/`;
  public static AUDIENCE_SECRET_NAME = `/${process.env.SAM_STACK_NAME}/Auth/Jwt/Audiences`;
}
