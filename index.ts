import { 
    SnippetApi,
    ConditionApi,
    CacheSettingsApi,
    HeaderApi,
    BackendApi,
    DomainApi, 
    ServiceApi, 
    ApiClient, 
    VersionApi 
} from 'fastly';

ApiClient.instance.authenticate(process.env.FASTLY_TOKEN);

const serviceApiInstance = new ServiceApi();
const versionApiInstance = new VersionApi();
const domainApiInstance = new DomainApi();;
const backendApiInstance = new BackendApi();
const headerApiInstance = new HeaderApi();
const cacheSettingsApiInstance = new CacheSettingsApi();
const conditionApiInstance = new ConditionApi();
const snippetApiInstance = new SnippetApi();

const logMessage = (message: string, ...args: any): void => console.log(`***api response***: ${message}`, ...args);
const logError = (message: string, err: any): void => console.log(`***api error***: ${message}`, err.response && err.response.text || err);

const callCreateService = async (): Promise<{id: string; version: number}> => {
    const name = 'CREATE SERVICE';
    let SERVICE_ID: string;
    let SERVICE_VERSION = 1;

    try {
        const resp = await serviceApiInstance.createService({
            comment: 'initial service creation',
            name: 'JS Api Service',
            customer_id: null,
            type: 'vcl',
        });

        logMessage(name, resp);

        ({id: SERVICE_ID} = resp);
    } catch (err) {
        SERVICE_ID = '2EgSbcP0CyLteqsen5u8nn';
        logError(name, err);
    }

    return {
        id: SERVICE_ID,
        version: SERVICE_VERSION,
    };
};

const callCreateDomain = async (id: string, version: number): Promise<void> => {
    const name = 'CREATE DOMAIN';

    try {
        const resp = await domainApiInstance.createDomain({
            service_id: id,
            version_id: version,
            name: 'dfp-api-onboarding.global.ssl.fastly.net',
        });

        logMessage(name, resp);
    } catch (err) {
        logError(name, err);
    }
}

const callCreateBackend = async (id: string, version: number): Promise<void> => {
    const address = 'fsly-sol-onboarding.storage.googleapis.com';
    const name = 'CREATE BACKEND';

    try {
        const resp = await backendApiInstance.createBackend({
            service_id: id,
            version_id: version,
            address,
            name: address,
            override_host: address,
            port: 443,
            use_ssl: true,
        });

        logMessage(name, resp);
    } catch (err) {
        logError(name, err);
    }
}

const callGetService = async (id: string): Promise<void> =>  {
    const name = 'GET SERVICE';

    try {
        const resp = await serviceApiInstance.getService({
            service_id: id,
        });

        logMessage(name, resp);
    } catch (err) {
        logError(name, err);
    }
}


const callCreateCondition = async (id: string, version: number): Promise<void> =>  {
    const name = 'CREATE CONDITION';

    try {
        const resp = await conditionApiInstance.createCondition({
            service_id: id,
            version_id: version,
            name: 'Is 404',
            statement: 'beresp.status == 404',
            type: 'CACHE',
        });

        logMessage(name, resp);
    } catch (err) {
        logError(name, err);
    }
}

const callCreateHeader = async (id: string, version: number): Promise<void> =>  {
    const name = 'CREATE HEADER';

    try {
        const resp = await headerApiInstance.createHeaderObject({
            service_id: id,
            version_id: version,
            action: 'set',
            name: 'No Cache 404 Header',
            type: 'request',
            dst: 'http.NoCache_404',
            src: '"false"',
        });

        logMessage(name, resp);
    } catch (err) {
        logError(name, err);
    }
}

const callCreateCacheSettings = async (id: string, version: number): Promise<void> =>  {
    const name = 'CREATE CACHE SETTING';

    try {
        const resp = await cacheSettingsApiInstance.createCacheSettings({
            service_id: id,
            version_id: version,
            action: 'pass',
            cache_condition: 'Is 404',
            name: 'Pass on 404',
            ttl: 0,
        });

        logMessage(name, resp);
    } catch (err) {
        logError(name, err);
    }
}

const callValidateService = async (id: string, version: number): Promise<{status: string}> => {
    const name = 'VALIDATE SERVICE';
    let resp: {status: string};

    try {
        resp = await versionApiInstance.validateServiceVersion({
            service_id: id,
            version_id: version,
        });

        logMessage(name, resp);
        
        return resp;
    } catch (err) {
        logError(name, err);

        return {status: 'failed'};
    }
}

const callActivateService = async (id: string, version: number): Promise<void> => {
    const name = 'ACTIVATE SERVICE';

    try {
        logMessage(name, `activating service ${id} with version ${version}`);

        const resp = await versionApiInstance.activateServiceVersion({
            service_id: id,
            version_id: version,
        });

        logMessage(name, `activated service ${id} with version ${version}`, resp);
    } catch (err) {
        logError(name, err);
    }
}

const callCloneService = async (id: string, version: number): Promise<number> => {
    const name = 'CLONE SERVICE';

    try {
        const resp = await versionApiInstance.cloneServiceVersion({
            service_id: id,
            version_id: version,
        });

        logMessage(name, resp);

        return resp.number;
    } catch (err) {
        logError(name, err);
    }

    return 1;
}

const callDeleteCacheSettings = async (id: string, version: number): Promise<void> =>  {
    const name = 'DELETE CACHE SETTING';

    try {
        const resp = await cacheSettingsApiInstance.deleteCacheSettings({
            service_id: id,
            version_id: version,
            cache_settings_name: 'Pass on 404',
        });

        logMessage(name, resp);
    } catch (err) {
        logError(name, err);
    }
}

const callCreateSnippet = async (id: string, version: number): Promise<void> =>  {
    const name = 'CREATE SNIPPET';
    const content = `
    if (beresp.status == 404) {
        set beresp.ttl = 0s;
        return(pass);
    }
    `.trim();
    try {
        const resp = await snippetApiInstance.createSnippet({
            service_id: id,
            version_id: version,
            name: 'Pass on 404',
            type: 'fetch',
            content,
            dynamic: 0,
        });

        logMessage(name, resp);
    } catch (err) {
        logError(name, err);
    }
}

(async () => {
    const {id, version} = await callCreateService();

    await callCreateDomain(id, version);
    await callCreateBackend(id, version);
    await callGetService(id);
    await callCreateCondition(id, version);
    await callCreateHeader(id, version);
    await callCreateCacheSettings(id, version);

    let validatedResp = await callValidateService(id, version);

    if (validatedResp.status !== 'ok') return;

    await callActivateService(id, version);

    const clonedVersion = await callCloneService(id, version);

    await callDeleteCacheSettings(id, clonedVersion);
    await callCreateSnippet(id, clonedVersion);

    validatedResp = await callValidateService(id, clonedVersion);

    if (validatedResp.status !== 'ok') return;

    await callActivateService(id, clonedVersion);
})(); 