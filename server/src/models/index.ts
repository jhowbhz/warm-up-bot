import Instance from './Instance';
import WarmingContact from './WarmingContact';
import Conversation from './Conversation';
import Message from './Message';
import WarmingSchedule from './WarmingSchedule';
import DailyMetric from './DailyMetric';
import Settings from './Settings';
import Bot from './Bot';
import Attendance from './Attendance';
import AttendanceMessage from './AttendanceMessage';
import Attendant from './Attendant';

// Definir associações
Instance.hasMany(Conversation, { foreignKey: 'instanceId', as: 'conversations' });
Instance.hasMany(WarmingSchedule, { foreignKey: 'instanceId', as: 'schedules' });
Instance.hasMany(DailyMetric, { foreignKey: 'instanceId', as: 'metrics' });

WarmingContact.hasMany(Conversation, { foreignKey: 'contactId', as: 'conversations' });

Conversation.belongsTo(Instance, { foreignKey: 'instanceId', as: 'instance' });
Conversation.belongsTo(WarmingContact, { foreignKey: 'contactId', as: 'contact' });
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });

Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

WarmingSchedule.belongsTo(Instance, { foreignKey: 'instanceId', as: 'instance' });

DailyMetric.belongsTo(Instance, { foreignKey: 'instanceId', as: 'instance' });

Bot.belongsTo(Instance, { foreignKey: 'instanceId', as: 'instance' });
Instance.hasMany(Bot, { foreignKey: 'instanceId', as: 'bots' });

Attendance.belongsTo(Instance, { foreignKey: 'instanceId', as: 'instance' });
Attendance.belongsTo(Bot, { foreignKey: 'botId', as: 'bot' });
Instance.hasMany(Attendance, { foreignKey: 'instanceId', as: 'attendances' });
Bot.hasMany(Attendance, { foreignKey: 'botId', as: 'attendances' });

AttendanceMessage.belongsTo(Attendance, { foreignKey: 'attendanceId', as: 'attendance' });
Attendance.hasMany(AttendanceMessage, { foreignKey: 'attendanceId', as: 'messages' });

Attendance.belongsTo(Attendant, { foreignKey: 'attendantId', as: 'attendant' });
Attendant.hasMany(Attendance, { foreignKey: 'attendantId', as: 'attendances' });

export {
  Instance,
  WarmingContact,
  Conversation,
  Message,
  WarmingSchedule,
  DailyMetric,
  Settings,
  Bot,
  Attendance,
  AttendanceMessage,
  Attendant,
};
