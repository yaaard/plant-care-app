import * as ImagePicker from 'expo-image-picker';

function hasLibraryAccess(
  permission: Awaited<ReturnType<typeof ImagePicker.getMediaLibraryPermissionsAsync>>
) {
  return permission.granted || permission.accessPrivileges === 'limited';
}

export async function pickImageFromLibraryAsync(): Promise<string | null> {
  const currentPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
  let isGranted = hasLibraryAccess(currentPermission);

  if (!isGranted) {
    const requestedPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    isGranted = hasLibraryAccess(requestedPermission);
  }

  if (!isGranted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets[0].uri;
}
