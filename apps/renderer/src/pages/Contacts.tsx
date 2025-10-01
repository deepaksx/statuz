import { useEffect, useState } from 'react';
import { Users, Plus, Edit, Trash2, Save, X, Search, UserPlus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Contact {
  phoneNumber: string;
  alias: string;
  role?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export function Contacts() {
  const { invoke } = useApp();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [authors, setAuthors] = useState<Array<{ phoneNumber: string; displayName: string; messageCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({ phoneNumber: '', alias: '', role: '', notes: '' });

  useEffect(() => {
    loadContacts();
    loadAuthors();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const result = await invoke('get-contacts', {});
      setContacts(result || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const loadAuthors = async () => {
    try {
      const result = await invoke('get-authors-from-watched-groups', {});
      setAuthors(result || []);
    } catch (error) {
      console.error('Failed to load authors:', error);
    }
  };

  const handleSaveContact = async () => {
    if (!formData.alias.trim() || !formData.phoneNumber.trim()) {
      toast.error('Phone number and alias are required');
      return;
    }

    try {
      await invoke('upsert-contact', formData);
      toast.success('Contact saved successfully');
      setShowAddModal(false);
      setShowEditModal(null);
      setFormData({ phoneNumber: '', alias: '', role: '', notes: '' });
      loadContacts();
    } catch (error) {
      console.error('Failed to save contact:', error);
      toast.error('Failed to save contact');
    }
  };

  const handleDeleteContact = async (phoneNumber: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      await invoke('delete-contact', { phoneNumber });
      toast.success('Contact deleted successfully');
      loadContacts();
    } catch (error) {
      console.error('Failed to delete contact:', error);
      toast.error('Failed to delete contact');
    }
  };

  const handleEditContact = (contact: Contact) => {
    setFormData({
      phoneNumber: contact.phoneNumber,
      alias: contact.alias,
      role: contact.role || '',
      notes: contact.notes || ''
    });
    setShowEditModal(contact);
  };

  const handleAddFromAuthor = (author: { phoneNumber: string; displayName: string }) => {
    setFormData({
      phoneNumber: author.phoneNumber,
      alias: author.displayName,
      role: '',
      notes: ''
    });
    setShowAddModal(true);
  };

  const filteredContacts = contacts.filter(contact =>
    contact.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phoneNumber.includes(searchTerm) ||
    (contact.role && contact.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const unregisteredAuthors = authors.filter(
    author => !contacts.some(contact => contact.phoneNumber === author.phoneNumber)
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600">
            Manage central contact list with aliases and roles for all WhatsApp groups
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary btn-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="flex items-center space-x-3">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts by alias, phone, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Contacts</div>
              <div className="text-2xl font-bold text-gray-900">{contacts.length}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserPlus className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">With Roles</div>
              <div className="text-2xl font-bold text-gray-900">
                {contacts.filter(c => c.role && c.role.trim()).length}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Unregistered</div>
              <div className="text-2xl font-bold text-gray-900">{unregisteredAuthors.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Unregistered Authors */}
      {unregisteredAuthors.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Unregistered Contacts from Groups ({unregisteredAuthors.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unregisteredAuthors.slice(0, 12).map(author => (
              <div key={author.phoneNumber} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{author.displayName}</div>
                  <div className="text-sm text-gray-500 font-mono truncate">{author.phoneNumber}</div>
                  <div className="text-xs text-gray-400">{author.messageCount} messages</div>
                </div>
                <button
                  onClick={() => handleAddFromAuthor(author)}
                  className="ml-2 p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Add to contacts"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {unregisteredAuthors.length > 12 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              And {unregisteredAuthors.length - 12} more...
            </div>
          )}
        </div>
      )}

      {/* Contacts List */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">All Contacts</h3>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading contacts...</p>
          </div>
        ) : filteredContacts.length > 0 ? (
          <div className="space-y-3">
            {filteredContacts.map(contact => (
              <div key={contact.phoneNumber} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{contact.alias}</h4>
                      {contact.role && (
                        <span className="badge badge-primary">{contact.role}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="font-mono">{contact.phoneNumber}</div>
                      {contact.notes && (
                        <div className="text-gray-500 italic">{contact.notes}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditContact(contact)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit contact"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.phoneNumber)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search' : 'Start by adding contacts from unregistered list above'}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {showEditModal ? 'Edit Contact' : 'Add Contact'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(null);
                  setFormData({ phoneNumber: '', alias: '', role: '', notes: '' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="e.g., 919876543210@c.us"
                  disabled={!!showEditModal}
                  className={clsx(
                    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                    showEditModal && 'bg-gray-100 cursor-not-allowed'
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alias *
                </label>
                <input
                  type="text"
                  value={formData.alias}
                  onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                  placeholder="e.g., John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Project Manager, Developer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(null);
                  setFormData({ phoneNumber: '', alias: '', role: '', notes: '' });
                }}
                className="btn btn-sm btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContact}
                disabled={!formData.alias.trim() || !formData.phoneNumber.trim()}
                className="btn btn-sm btn-primary"
              >
                <Save className="h-4 w-4 mr-1" />
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
