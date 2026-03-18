import { Tabs } from 'expo-router';
import { Home, FlaskConical, CheckSquare, MessageCircle } from 'lucide-react-native';
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#9333ea', tabBarInactiveTintColor: '#9ca3af', tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#f3f4f6', paddingBottom: 8, paddingTop: 4, height: 64 }, tabBarLabelStyle: { fontSize: 10, fontWeight: '500' } }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="labs" options={{ title: 'Labs', tabBarIcon: ({ color, size }) => <FlaskConical color={color} size={size} /> }} />
      <Tabs.Screen name="actions" options={{ title: 'Actions', tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} /> }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach', tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }} />
    </Tabs>
  );
}