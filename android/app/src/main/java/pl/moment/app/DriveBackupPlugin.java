package pl.moment.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "DriveBackup")
public class DriveBackupPlugin extends Plugin {

    private static final String PREFERENCES = "moment_backup";
    private static final String TREE_URI_KEY = "tree_uri";
    private static final String BACKUP_PREFIX = "Moment-backup-";
    private static final String BACKUP_SUFFIX = ".json";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void chooseFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );
        startActivityForResult(call, intent, "folderPicked");
    }

    @ActivityCallback
    public void folderPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject response = new JSObject();
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }

        Uri treeUri = result.getData().getData();
        if (treeUri == null) {
            call.reject("Nie udało się odczytać wybranego folderu.");
            return;
        }

        try {
            int grantFlags = result.getData().getFlags()
                & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            getActivity().getContentResolver().takePersistableUriPermission(treeUri, grantFlags);
            boolean stored = getContext().getSharedPreferences(PREFERENCES, 0)
                .edit()
                .putString(TREE_URI_KEY, treeUri.toString())
                .commit();
            if (!stored) {
                throw new IOException("Nie udało się zapamiętać wybranego folderu kopii.");
            }

            DocumentFile folder = DocumentFile.fromTreeUri(getContext(), treeUri);
            JSObject response = new JSObject();
            response.put("cancelled", false);
            response.put("hasFolder", true);
            response.put("folderName", folderName(folder));
            call.resolve(response);
        } catch (Exception error) {
            call.reject("Nie udało się zapamiętać dostępu do folderu kopii.", error);
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        runAsync(call, () -> {
            Uri treeUri = selectedTreeUri();
            JSObject response = new JSObject();
            if (treeUri == null) {
                response.put("hasFolder", false);
                response.put("folderName", "");
                response.put("backupCount", 0);
                return response;
            }

            DocumentFile folder = requireBackupFolder(treeUri);
            response.put("hasFolder", true);
            response.put("folderName", folderName(folder));
            response.put("backupCount", backupFiles(folder).size());
            return response;
        });
    }

    @PluginMethod
    public void getLatestBackup(PluginCall call) {
        runAsync(call, () -> {
            Uri treeUri = selectedTreeUri();
            JSObject response = new JSObject();
            if (treeUri == null) {
                response.put("found", false);
                return response;
            }

            List<DocumentFile> backups = backupFiles(requireBackupFolder(treeUri));
            if (backups.isEmpty()) {
                response.put("found", false);
                return response;
            }

            DocumentFile latest = backups.get(0);
            response.put("found", true);
            response.put("name", latest.getName());
            response.put("contents", readFile(latest));
            response.put("lastModified", latest.lastModified());
            return response;
        });
    }

    @PluginMethod
    public void writeBackup(PluginCall call) {
        String contents = call.getString("contents");
        if (contents == null || contents.isEmpty()) {
            call.reject("Nie można zapisać pustej kopii.");
            return;
        }

        runAsync(call, () -> {
            Uri treeUri = selectedTreeUri();
            if (treeUri == null) {
                throw new IOException("Najpierw wybierz folder kopii na Dysku Google.");
            }

            DocumentFile folder = requireBackupFolder(treeUri);
            String timestamp = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss-SSS", Locale.US)
                .format(new Date());
            String fileName = BACKUP_PREFIX + timestamp + BACKUP_SUFFIX;
            DocumentFile file = folder.createFile("application/json", fileName);
            if (file == null) {
                throw new IOException("Dysk Google nie utworzył pliku kopii.");
            }

            try (OutputStream output = getContext().getContentResolver().openOutputStream(file.getUri())) {
                if (output == null) {
                    throw new IOException("Nie można otworzyć pliku kopii do zapisu.");
                }
                output.write(contents.getBytes(StandardCharsets.UTF_8));
                output.flush();
            } catch (Exception error) {
                file.delete();
                throw error;
            }

            removeOlderBackups(folder);
            JSObject response = new JSObject();
            response.put("fileName", fileName);
            response.put("lastModified", System.currentTimeMillis());
            return response;
        });
    }

    @PluginMethod
    public void pickBackupFile(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(call, intent, "backupFilePicked");
    }

    @ActivityCallback
    public void backupFilePicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject response = new JSObject();
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }

        Uri fileUri = result.getData().getData();
        if (fileUri == null) {
            call.reject("Nie udało się odczytać wybranego pliku.");
            return;
        }

        runAsync(call, () -> {
            JSObject response = new JSObject();
            response.put("cancelled", false);
            response.put("contents", readFile(fileUri));
            return response;
        });
    }

    @Override
    protected void handleOnDestroy() {
        executor.shutdownNow();
        super.handleOnDestroy();
    }

    private void runAsync(PluginCall call, Callable<JSObject> operation) {
        if (executor.isShutdown()) {
            call.reject("Usługa kopii zapasowych jest niedostępna.");
            return;
        }

        executor.execute(() -> {
            try {
                call.resolve(operation.call());
            } catch (Exception error) {
                call.reject(
                    error.getMessage() == null ? "Operacja kopii zapasowej nie powiodła się." : error.getMessage(),
                    error.getClass().getSimpleName(),
                    error
                );
            }
        });
    }

    private Uri selectedTreeUri() {
        String uri = getContext().getSharedPreferences(PREFERENCES, 0).getString(TREE_URI_KEY, null);
        return uri == null ? null : Uri.parse(uri);
    }

    private DocumentFile requireBackupFolder(Uri treeUri) throws IOException {
        DocumentFile folder = DocumentFile.fromTreeUri(getContext(), treeUri);
        if (folder == null || !folder.exists() || !folder.isDirectory()) {
            throw new IOException("Wybrany folder kopii jest niedostępny. Wybierz go ponownie.");
        }
        return folder;
    }

    private String folderName(DocumentFile folder) {
        String name = folder == null ? null : folder.getName();
        return name == null || name.trim().isEmpty() ? "Google Drive" : name;
    }

    private List<DocumentFile> backupFiles(DocumentFile folder) {
        List<DocumentFile> backups = new ArrayList<>();
        for (DocumentFile file : folder.listFiles()) {
            String name = file.getName();
            if (file.isFile() && name != null && name.startsWith(BACKUP_PREFIX) && name.endsWith(BACKUP_SUFFIX)) {
                backups.add(file);
            }
        }
        Collections.sort(backups, (left, right) -> right.getName().compareTo(left.getName()));
        return backups;
    }

    private void removeOlderBackups(DocumentFile folder) {
        List<DocumentFile> backups = backupFiles(folder);
        for (int index = 5; index < backups.size(); index++) {
            backups.get(index).delete();
        }
    }

    private String readFile(DocumentFile file) throws IOException {
        return readFile(file.getUri());
    }

    private String readFile(Uri uri) throws IOException {
        try (InputStream input = getContext().getContentResolver().openInputStream(uri);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) {
                throw new IOException("Nie można otworzyć wybranego pliku kopii.");
            }

            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }
}
