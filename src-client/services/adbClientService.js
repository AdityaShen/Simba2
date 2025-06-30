import { elements } from '../domElements.js';
import { globalState } from '../state.js';

import { appendLog } from '../loggerService.js';
import { requestAdbDevices } from '../ui/sidebarControls.js';








export async function sendAdbCommandToServer(commandData) {
    return new Promise((resolve, reject) => {
        if (!globalState.ws || globalState.ws.readyState !== WebSocket.OPEN || !globalState.selectedDeviceId) {
            reject(new Error('WebSocket not connected or no device selected for ADB command.'));
            return;
        }
        const commandId = Date.now() + Math.random().toString(36).substring(2, 7);
        globalState.pendingAdbCommands.set(commandId, { resolve, reject, commandType: commandData.commandType });
        const messageToSend = {
            action: 'adbCommand', commandId: commandId,
            deviceId: globalState.selectedDeviceId, ...commandData
        };
        try {
            globalState.ws.send(JSON.stringify(messageToSend));
        } catch (e) {
            globalState.pendingAdbCommands.delete(commandId);
            reject(new Error(`WebSocket send error for ADB command: ${e.message}`));
            return;
        }
        setTimeout(() => {
            if (globalState.pendingAdbCommands.has(commandId)) {
                const cmd = globalState.pendingAdbCommands.get(commandId);
                cmd.reject(new Error(`ADB command ${cmd.commandType} (ID: ${commandId}) timed out.`));
                globalState.pendingAdbCommands.delete(commandId);
            }
        }, 15000);
    });
}