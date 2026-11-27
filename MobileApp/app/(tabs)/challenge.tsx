import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';

type Row = {id:number; title:string; category:string; total:number; uploader:string; completed:boolean};
type Summary = {challenges:Row[]; results:{id:number; title:string; category:string; score:number; total:number; date:string}[]; streak:number; completed:number};
type Detail = {id:number; title:string; completed:boolean; questions:{question:string; options:string[]; selected:number; correct:number; explanation:string}[]};
const tabs = ['Aptitude','Grammar','Behaviour','Results'];
const accents: Record<string,string> = {Aptitude:'#186a75', Grammar:'#77509b', Behaviour:'#9b5326', Results:'#316942'};
const icons: Record<string,keyof typeof Ionicons.glyphMap> = {Aptitude:'calculator-outline', Grammar:'book-outline', Behaviour:'people-outline', Results:'ribbon-outline'};
export default function ChallengeScreen() {
  const [data,setData] = useState<Summary>();
  const [tab,setTab] = useState(tabs[0]);
  const [detail,setDetail] = useState<Detail>();
  const [answers,setAnswers] = useState<number[]>([]);
  const [unread,setUnread] = useState<number[]>([]);
  const [focused,setFocused] = useState(false);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const lock = useRef(false);
  const refresh = useCallback(async () => {
    const [list,inbox] = await Promise.all([api.get('daily-activity/'), api.get('daily-activity/inbox/')]);
    setData(list.data); setUnread(inbox.data.unread);
  },[]);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    const load = () => refresh().catch(() => setError('Unable to load Daily Activity.'));
    load(); const timer = setInterval(load,30000);
    return () => {setFocused(false); clearInterval(timer);};
  },[refresh]));
  const visible = data?.challenges.filter(c => !c.completed && c.category === tab) || [];
  const seen = focused && !detail ? visible.filter(c => unread.includes(c.id)).map(c => c.id).join(',') : '';
  useEffect(() => {
    if (!seen) return;
    const ids = seen.split(',').map(Number);
    api.post('daily-activity/inbox/',{ids}).then(() => setUnread(old => old.filter(i => !ids.includes(i)))).catch(() => {});
  },[seen]);
  const run = async (fn:()=>Promise<void>) => {
    if (lock.current) return;
    lock.current=true; setBusy(true); setError('');
    try {await fn();} catch {setError('Request failed. Please try again.');}
    finally {lock.current=false; setBusy(false);}
  };
  const open = (id:number) => run(async () => {
    const r = await api.get('daily-activity/'+id+'/');
    setDetail({...r.data,id}); setAnswers(Array(r.data.questions.length).fill(-1));
  });
  const submit = () => run(async () => {
    await api.post('daily-activity/'+detail!.id+'/',{answers});
    setDetail(undefined); setTab('Results'); await refresh();
  });
  const button = (label:string,fn:()=>void,disabled=false) => <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={fn} style={[s.button,(busy || disabled) && {opacity:0.5}]}><Text style={s.white}>{label}</Text></Pressable>;
  return <SafeAreaView style={{flex:1,backgroundColor:'#f5f7f6'}}><ScrollView contentContainerStyle={s.page}>
    <Text style={s.heading}>Daily Activity</Text>
    {data && <View style={s.streak}><View style={s.line}><Ionicons name="flame" color="#ffc372" size={24}/><Text style={s.white}>Challenge streak</Text></View>
      <Text style={s.score}>{data.streak}<Text style={s.denominator}> / 30</Text></Text>
      <View style={s.track}><View style={{height:7,width:`${data.streak/30*100}%`,backgroundColor:'#ffbd68'}} /></View>
      <Text style={s.streakNote}>{data.completed} challenges completed</Text></View>}
    <View style={s.tabs}>{tabs.map(t => <Pressable key={t} accessibilityRole="tab" accessibilityState={{selected:t===tab}} disabled={busy} onPress={() => {setTab(t);setDetail(undefined);}} style={[s.segment,t===tab && {backgroundColor:'#fff'}]}><Ionicons name={icons[t]} size={19} color={accents[t]} /><Text style={s.segmentLabel}>{t}</Text>{data?.challenges.some(c => c.category===t && unread.includes(c.id)) && <View accessibilityLabel="New challenges" style={s.dot}/>}</Pressable>)}</View>
    {!!error && <View><Text>{error}</Text>{button('Refresh',()=>run(refresh))}</View>}
    {detail ? <><Text style={s.title}>{detail.title}</Text>{detail.questions.map((q,i) => <View key={i} style={s.card}><Text style={s.title}>{i+1}. {q.question}</Text>
      {detail.completed ? <><Text style={{color:q.selected===q.correct?'#267548':'#ae3131'}}>Your answer: {q.options[q.selected]}</Text><Text>Correct answer: {q.options[q.correct]}</Text><Text>{q.explanation}</Text></> :
        q.options.map((o,j) => <Pressable key={j} disabled={busy} accessibilityRole="radio" accessibilityState={{checked:answers[i]===j}} onPress={() => setAnswers(prev => prev.map((v,k)=>k===i?j:v))} style={[s.tab,answers[i]===j && s.selected]}><Text>{o}</Text></Pressable>)}</View>)}
      {!detail.completed && button('Submit challenge',submit,answers.includes(-1))}{button('Back',()=>setDetail(undefined))}</> :
      !data ? <Text>Loading challenges...</Text> : tab==='Results' ? <><Text style={s.title}>Results ({data.results.length})</Text>{!data.results.length && <Text>No results yet.</Text>}{data.results.map(r=><View key={r.id} style={[s.card,{borderLeftColor:accents[r.category],borderLeftWidth:4}]}><View style={s.line}><Ionicons name="ribbon-outline" size={19} color={accents.Results}/><Text style={s.meta}>{r.category} · {new Date(r.date).toLocaleDateString()}</Text></View><Text style={s.title}>{r.title}</Text><Text style={s.mark}>{r.score}/{r.total} marks</Text><Text>{r.score} correct · {r.total-r.score} incorrect</Text>{button('View result',()=>open(r.id))}</View>)}</> :
      <><Text style={s.title}>{tab} ({visible.length})</Text>{!visible.length && <Text>No pending challenges.</Text>}{visible.map(c=><View key={c.id} style={[s.card,{borderLeftColor:accents[tab],borderLeftWidth:4}]}><View style={s.line}><Ionicons name={icons[tab]} size={21} color={accents[tab]}/><Text style={[s.meta,{color:accents[tab]}]}>{tab}</Text></View><Text style={s.title}>{c.title}</Text><Text style={s.meta}>{c.uploader} · {c.total} questions</Text>{button('Start Challenge',()=>open(c.id))}</View>)}</>}
  </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
  page:{padding:18,gap:14},heading:{fontSize:24,fontWeight:'700'},title:{fontSize:17,fontWeight:'600'},
  card:{padding:16,gap:10,borderWidth:1,borderColor:'#d2ded7',backgroundColor:'#fff',borderRadius:8},
  streak:{padding:20,gap:10,backgroundColor:'#153c39',borderRadius:8},line:{flexDirection:'row',alignItems:'center',gap:8},
  score:{fontSize:36,fontWeight:'800',color:'white'},denominator:{fontSize:18,color:'#bbd3ce'},streakNote:{color:'#d4e4dc'},
  track:{height:7,backgroundColor:'#456762',borderRadius:4,overflow:'hidden'},tabs:{flexDirection:'row',backgroundColor:'#e3ebe6',borderRadius:8,padding:3},
  segment:{flex:1,minHeight:54,alignItems:'center',justifyContent:'center',gap:4,borderRadius:6},
  segmentLabel:{fontSize:12,color:'#253e36',fontWeight:'600'},dot:{position:'absolute',right:7,top:6,width:8,height:8,borderRadius:4,backgroundColor:'#288453'},
  meta:{fontSize:13,color:'#51635c'},mark:{fontSize:20,fontWeight:'700',color:'#305548'},
  tab:{padding:9,borderWidth:1,borderColor:'#b3c5ba',borderRadius:5},selected:{backgroundColor:'#d4eddc'},
  button:{backgroundColor:'#315e50',alignSelf:'flex-start',paddingHorizontal:14,paddingVertical:9,borderRadius:5},white:{color:'#fff',fontWeight:'600'}
});
