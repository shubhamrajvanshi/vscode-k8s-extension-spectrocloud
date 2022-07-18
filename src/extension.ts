import * as k8s from 'vscode-kubernetes-tools-api';
import * as vscode from 'vscode';
import { SPECTROCLOUD_CLUSTER_PROVIDER } from './spectrocloud-cluster-provider';

export async function activate(_context: vscode.ExtensionContext) {
    const clusterProvider = await k8s.extension.clusterProvider.v1;
    if (clusterProvider.available) {
        clusterProvider.api.register(SPECTROCLOUD_CLUSTER_PROVIDER);
    } else {
        vscode.window.showErrorMessage("Can't register SpectroCloud cluster provider: " + clusterProvider.reason);
    }
}

