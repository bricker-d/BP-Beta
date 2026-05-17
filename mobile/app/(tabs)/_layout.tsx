import { Tabs } from 'expo-router';
import { Home, FlaskConical, CheckSquare, MessageCircle, ClipboardList } from 'lucide-react-native';
export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#C96A2B',
      tabBarInactiveTintColor: '#9ca3af',
      tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#f3f4f6', paddingBottom: 8, paddingTop: 4, height: 64 },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '500', fontFamily: 'DMSans_500Medium' },
    }}>
      <Tabs.Screen name="index"     options={{ title: 'Home',     tabBarIcon: ({ color, size }) => <Home          color={color} size={size} /> }} />
      <Tabs.Screen name="labs"      options={{ title: 'Labs',     tabBarIcon: ({ color, size }) => <FlaskConical  color={color} size={size} /> }} />
      <Tabs.Screen name="actions"   options={{ title: 'Actions',  tabBarIcon: ({ color, size }) => <CheckSquare   color={color} size={size} /> }} />
      <Tabs.Screen name="protocols" options={{ title: 'Protocol', tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} /> }} />
      <Tabs.Screen name="coach"     options={{ title: 'Coach',    tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }} />
      <Tabs.Screen name="profile"   options={{ href: null }} />
    </Tabs>
  );
}