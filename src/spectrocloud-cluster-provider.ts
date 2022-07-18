import * as k8s from 'vscode-kubernetes-tools-api';
import * as shelljs from 'shelljs';
import { ChildProcess } from 'child_process';

const SPECTROCLOUD_CLUSTER_PROVIDER_ID = 'spectrocloud';

export const SPECTROCLOUD_CLUSTER_PROVIDER: k8s.ClusterProviderV1.ClusterProvider = {
    id: SPECTROCLOUD_CLUSTER_PROVIDER_ID,
    displayName: 'SpectroCloud',
    supportedActions: ['create'],
    next: onNext
};

const PAGE_SETTINGS = 'settings';

const SETTING_CLUSTER_NAME = 'clustername';
const SETTING_SPECTROCLOUD_PROJECT_NAME = 'projectname';
const SETTING_SPECTROCLOUD_APIKEY = 'spectroApiKey';
const SETTING_IMAGE_VERSION = 'imageversion';

function onNext(wizard: k8s.ClusterProviderV1.Wizard, _action: k8s.ClusterProviderV1.ClusterProviderAction, message: any): void {
    wizard.showPage("<html><body><h1>SpectroCloud Working..<br>Please wait...</h1></body></html>");
    console.log("this is from on Next function");
    console.log(message);
    setTimeout(() => {
        const sendingStep: string = message[k8s.ClusterProviderV1.SENDING_STEP_KEY];
    const htmlPromise = getPage(sendingStep, message);
    wizard.showPage(htmlPromise);
    }, 2000);
}

function getPage(sendingStep: string, previousData: any): k8s.ClusterProviderV1.Sequence<string> {
    switch (sendingStep) {
        case k8s.ClusterProviderV1.SELECT_CLUSTER_TYPE_STEP_ID:
            return collectSettings(previousData);
        case PAGE_SETTINGS:
            return createCluster(previousData);
        default:
            console.log("error no step defined");
            return "Internal error";
    }
}

function collectSettings(previousData: any): string {
    console.log("previous data recieved is");
    console.log(previousData);
    const inputSettings = [
        `<p>SpectroCloud Tenant/User Api Key: <input type='text' name='${SETTING_SPECTROCLOUD_APIKEY}' /></p>`,
        `<p>SpectroCloud Project Name: <input type='text' name='${SETTING_SPECTROCLOUD_PROJECT_NAME}' /></p>`,
        `<p>Cluster name: <input type='text' name='${SETTING_CLUSTER_NAME}' /></p>`,
        `<p>Image version (blank for default): <input type='text' name='${SETTING_IMAGE_VERSION}' value='' /></p>`  // TODO: call Docker Hub for available versions, or use a freeform 'image' field to allow custom images
    ];
    const html = formPage(
        PAGE_SETTINGS,
        "SpectroCloud Cluster Settings",
        inputSettings.join('\n'),
        "Create",
        previousData);
    return html;
}

function createCluster(previousData: any): k8s.ClusterProviderV1.Observable<string> {
    console.log("inside create cluster function");
    console.log(previousData);
    return {
        subscribe(observer: k8s.ClusterProviderV1.Observer<string>): void {
            const p = observer.onNext("<h1>Creating SpectroCloud cluster - please wait</h1>");
            console.log("value of promise is ", p);
            let stdout = '';
            let stderr = '';
            let resultPara = '';
            let title = 'Creating SpectroCloud cluster - please wait';
            function html() {
                return `<h1>${title}</h1>${paragraphise(stdout)}${paragraphise(stderr, 'red')}${resultPara}`;
            }
            // const clusterName: string = previousData[SETTING_CLUSTER_NAME];
            // const imageVersion: string = previousData[SETTING_IMAGE_VERSION];
            // const imageArg = (imageVersion && imageVersion.length > 0) ? `--image kindest/node:${imageVersion}` : '';
            // const childProcess = shelljs.exec(`kind create cluster --name ${clusterName} ${imageArg}`, { async: true }) as ChildProcess;
            const childProcess = shelljs.exec(`curl https://www.spectrocloud.com/`, { async: true }) as ChildProcess;
            childProcess.stdout.on('data', (chunk: string) => {
                stdout += chunk;
                observer.onNext(html());
            });
            childProcess.stderr.on('data', (chunk: string) => {
                stderr += chunk;
                observer.onNext(html());
            });
            childProcess.on('error', (err: Error) => {
                stderr += err.message;
                observer.onNext(html());
            });
            childProcess.on('exit', (code: number) => {
                if (code === 0) {
                    title = 'Cluster created';
                    resultPara = `<p style='font-weight: bold; color: lightgreen'>Your local cluster has been created BUT HAS NOT BEEN set as active in your kubeconfig</p>`;
                    observer.onNext(html());
                    // shelljs.exec(`kind get kubeconfig-path --name ${clusterName}`, { async: true }, (code, pStdout, _pStderr) => {
                    //     if (code === 0) {
                    //         const kcpath = pStdout.trim();
                    //         resultPara = `<p style='font-weight: bold; color: lightgreen'>Your local cluster has been created and its kubeconfig is at ${kcpath}. To work with your cluster, switch to this kubeconfig, or copy settings from this file to your main kubeconfig.</p>`;
                    //         observer.onNext(html());
                    //     }
                    // });
                } else {
                    title = 'Cluster creation failed';
                    resultPara = `<p style='font-weight: bold; color: red'>Your local cluster was not created.  See tool output above for why.</p>`;
                    observer.onNext(html());
                }
            });
        }
    };
}

function formPage(stepId: string, title: string, body: string, buttonCaption: string | null, previousData: any): string {
    const buttonHtml = buttonCaption ? `<button onclick='${k8s.ClusterProviderV1.NEXT_PAGE}'>${buttonCaption}</button>` : '';
    const previousDataFields = Object.keys(previousData)
                                     .filter((k) => k !== k8s.ClusterProviderV1.SENDING_STEP_KEY)
                                     .map((k) => `<input type='text' name='${k}' value='${previousData[k]}' />`)
                                     .join('\n');
    const html = `<h1>${title}</h1>
    <form id="${k8s.ClusterProviderV1.WIZARD_FORM_NAME}">
        <input type='hidden' name='${k8s.ClusterProviderV1.SENDING_STEP_KEY}' value='${stepId}' />
        ${previousDataFields}
        ${body}
        <p>${buttonHtml}</p>
    </form>
    `;

    return html;
}

function paragraphise(text: string, colour?: string): string {
    const colourAttr = colour ? ` style='color:${colour}'` : '';
    const lines = text.split('\n').map((l) => l.trim());
    const paras = lines.map((l) => `<p${colourAttr}>${l}</p>`);
    return paras.join('\n');
}
