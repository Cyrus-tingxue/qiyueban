import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { Colors } from '../constants/Colors';
import { useLang } from '../contexts/LanguageContext';
import { authService } from '../services/authService';
import { postService } from '../services/postService';
import { announcementService } from '../services/announcementService';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function AdminScreen() {
  const { t } = useLang();
  const { user, isLoggedIn } = useAuth();
  const router = useRouter();

  const [announcement, setAnnouncement] = useState('');
  const [graveRequests, setGraveRequests] = useState<any[]>([]);
  const [ipBans, setIpBans] = useState<any[]>([]);
  
  const [banUid, setBanUid] = useState('');
  const [banUsername, setBanUsername] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banIpStr, setBanIpStr] = useState('');
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !user?.is_admin) {
      router.replace('/(tabs)/my');
      return;
    }
    fetchData();
  }, [isLoggedIn, user]);

  const fetchData = async () => {
    try {
      const a = await announcementService.getAnnouncement();
      if(a) setAnnouncement(a.content || '');
      
      const g = await postService.getGraveRequests('pending');
      setGraveRequests(g);

      const i = await authService.getIpBans();
      setIpBans(i);
    } catch (e) { console.warn(e); }
  };

  const handleUpdateAnnouncement = async () => {
    setLoading(true);
    try {
      await announcementService.updateAnnouncement(announcement);
      Alert.alert('Success', 'Announcement updated');
    } catch (e) {
      Alert.alert('Error', 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveGrave = async (id: number) => {
    try {
      await postService.approveGraveRequest(id);
      fetchData();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const handleBanByUid = async () => {
    if(!banUid) return;
    try {
      await authService.banUser(Number(banUid), banReason);
      Alert.alert('Success', 'User banned');
      setBanUid('');
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const handleBanByUsername = async () => {
    if(!banUsername) return;
    try {
      await authService.banUserByUsername(banUsername, banReason);
      Alert.alert('Success', 'User banned');
      setBanUsername('');
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const handleBanIp = async () => {
    if(!banIpStr) return;
    try {
      await authService.banIp(banIpStr, banReason);
      Alert.alert('Success', 'IP banned');
      setBanIpStr('');
      fetchData();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  if (!isLoggedIn || !user?.is_admin) return <View style={styles.container} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        
        {/* Announcement Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('announcement')}</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            multiline
            textAlignVertical="top"
            value={announcement}
            onChangeText={setAnnouncement}
          />
          <TouchableOpacity style={styles.btn} onPress={handleUpdateAnnouncement} disabled={loading}>
            <Text style={styles.btnText}>{t('save')}</Text>
          </TouchableOpacity>
        </View>

        {/* Grave Requests Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('graveRequests')}</Text>
          {graveRequests.length === 0 && <Text style={styles.emptyText}>No pending requests</Text>}
          {graveRequests.map(req => (
            <View key={req.id} style={styles.card}>
              <Text style={styles.cardText}>Post ID: {req.post_id}</Text>
              <Text style={styles.cardText}>User ID: {req.user_id}</Text>
              <Text style={styles.cardText}>Reason: {req.reason}</Text>
              <View style={styles.row}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleApproveGrave(req.id)}>
                  <Text style={styles.actionText}>{t('approve')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* User Ban Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('userBan')}</Text>
          <TextInput style={styles.input} placeholder={t('reason')} placeholderTextColor={Colors.textMuted} value={banReason} onChangeText={setBanReason} />
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="UID" placeholderTextColor={Colors.textMuted} value={banUid} onChangeText={setBanUid} keyboardType="number-pad" />
            <TouchableOpacity style={styles.btn} onPress={handleBanByUid}>
              <Text style={styles.btnText}>{t('banByUid')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="Username" placeholderTextColor={Colors.textMuted} value={banUsername} onChangeText={setBanUsername} />
            <TouchableOpacity style={styles.btn} onPress={handleBanByUsername}>
              <Text style={styles.btnText}>{t('banByUsername')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* IP Ban Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('ipBan')}</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="IP Address" placeholderTextColor={Colors.textMuted} value={banIpStr} onChangeText={setBanIpStr} />
            <TouchableOpacity style={styles.btn} onPress={handleBanIp}>
              <Text style={styles.btnText}>{t('ipBan')}</Text>
            </TouchableOpacity>
          </View>
          {ipBans.map(ip => (
            <View key={ip.id} style={styles.card}>
              <Text style={styles.cardText}>{ip.ip_address} - {ip.reason}</Text>
              <TouchableOpacity onPress={async () => { await authService.unbanIp(ip.id); fetchData(); }}>
                <Text style={styles.dangerText}>{t('unban')}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  section: { marginBottom: 24, backgroundColor: Colors.surface, padding: 16, borderRadius: 12 },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  input: { backgroundColor: Colors.inputBg, color: Colors.text, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: Colors.inputBorder },
  btn: { backgroundColor: Colors.primary, padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: Colors.textOnPrimary, fontWeight: 'bold' },
  emptyText: { color: Colors.textSecondary },
  card: { backgroundColor: Colors.background, padding: 12, borderRadius: 8, marginBottom: 8 },
  cardText: { color: Colors.text, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { backgroundColor: Colors.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, marginTop: 8 },
  actionText: { color: Colors.textOnPrimary, fontSize: 12 },
  dangerText: { color: Colors.danger, marginTop: 8 },
});
