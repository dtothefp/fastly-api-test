import { 
    SnippetApi,
    ServiceApi, 
    ApiClient, 
    VersionApi,
    DictionaryApi,
    DictionaryItemApi,
    HistoricalApi,
    EventsApi,
} from 'fastly';

ApiClient.instance.authenticate(process.env.FASTLY_TOKEN);

const serviceApiInstance = new ServiceApi();
const versionApiInstance = new VersionApi();
const snippetApiInstance = new SnippetApi();
const dictionaryApiInstance = new DictionaryApi();
const dictionaryItemApiInstance = new DictionaryItemApi();
const statsApiInstance = new HistoricalApi();
const eventsApiInstance = new EventsApi();

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

        interface Versions {
            number: number;
        }

        const versions: Versions[] = await versionApiInstance.listServiceVersions({
            service_id: SERVICE_ID,
        });

        SERVICE_VERSION = versions
            .map(({number}) => number)
            .sort((a, b) => b - a)[0];
    }

    return {
        id: SERVICE_ID,
        version: SERVICE_VERSION,
    };
};

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


const callDictionaryItem = async (id: string, version: number): Promise<void> =>  {
    const name = 'CREATE DICTIONARY';
    let DICT_ID: string | null = null;

    try {
        const resp = await dictionaryApiInstance.createDictionary({
            service_id: id,
            version_id: version,
            name: 'api_dict',
        });

        DICT_ID = resp.id;

        logMessage(name, resp);
    } catch (err) {
        logError(name, err);
    }

    if (DICT_ID !== 'string') {
        try {
            const resp = await dictionaryApiInstance.listDictionaries({
                service_id: id,
                version_id: version,
            });

            ([ {id: DICT_ID} ] = resp);

            logMessage(name, resp);
        } catch (err) {
            logError(name, err);
        }
    }

    try {
        const resp = await dictionaryItemApiInstance.upsertDictionaryItem({
            service_id: id,
            dictionary_id: DICT_ID,
            dictionary_item_key: 'test-key',
            item_value: 'test-value',
        });
        logMessage(name, resp);
      } catch(err) {
        logError(name, err);
      }
}

const callGetStats = async (): Promise<void> =>  {
    const name = 'GET STATS';

    try {
        const resp = await statsApiInstance.getHistStats({
            from: new Date(2022,5,1),
            to: new Date(),
            by: 'hour',
            region: 'usa',
        });

        logMessage(name, resp.data);
    } catch (err) {
        logError(name, err);
    }
}

const callGetAuditLogs = async (): Promise<void> =>  {
    const name = 'GET AUDIT LOGS';

    try {
        const resp = await eventsApiInstance.listEvents({
            'filter[customer_id]': process.env.FASTLY_CUSTOMER_ID,
            'page[number]': '1',
            'page[size]': '20',
            sort: 'created_at',
        });

        logMessage(name, resp.data);
    } catch (err) {
        logError(name, err);
    }
}

(async () => {
    const {id, version} = await callCreateService();

    await callCreateSnippet(id, version);
    await callDictionaryItem(id, version);
    await callGetStats();
    await callGetAuditLogs();
})(); 