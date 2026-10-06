import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const myRooms = [
  { id: "1", name: "Dreamy bedroom pop", members: "6 of 8 members", note: "New: Sam shared a chorus idea" },
  { id: "2", name: "Beginner-friendly beats", members: "5 of 8 members", note: "Weekly challenge: 8-bar loop" },
];

const suggested = [{ id: "3", name: "Local indie folk", members: "4 of 8, in your city" }];

export default function Rooms() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
      <Text style={styles.title}>Your rooms</Text>
      {myRooms.map((room) => (
        <View key={room.id} style={styles.card}>
          <Text style={styles.name}>{room.name}</Text>
          <Text style={styles.info}>{room.members}</Text>
          <Text style={styles.info}>{room.note}</Text>
          <Pressable style={styles.button} onPress={() => alert("Coming soon")}>
            <Text style={styles.buttonText}>Open room</Text>
          </Pressable>
        </View>
      ))}

      <Text style={[styles.info, { marginVertical: 8 }]}>Suggested for you</Text>
      {suggested.map((room) => (
        <View key={room.id} style={styles.card}>
          <Text style={styles.name}>{room.name}</Text>
          <Text style={styles.info}>{room.members}</Text>
          <Pressable style={styles.button} onPress={() => alert("Coming soon")}>
            <Text style={styles.buttonText}>Join room</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#111" },
  title: { fontSize: 28, fontWeight: "600", color: "white", marginBottom: 16 },
  card: { backgroundColor: "#1c1c1c", borderRadius: 14, padding: 14, marginBottom: 14, gap: 8 },
  name: { color: "white", fontWeight: "600", fontSize: 16 },
  info: { color: "#aaa", fontSize: 13 },
  button: { borderWidth: 1, borderColor: "#666", borderRadius: 10, padding: 10, alignItems: "center", marginTop: 4 },
  buttonText: { color: "white" },
});